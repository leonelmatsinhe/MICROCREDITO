<template>
  <div class="gestor-view bg-light min-vh-100">
    <!-- ═══════════════ NAVBAR ═══════════════ -->
    <b-navbar toggleable="lg" type="dark" class="navbar-mbr shadow-sm py-2" fixed="top">
      <b-container fluid>
        <b-navbar-brand href="#" class="d-flex align-items-center" @click="activeSection = 'dashboard'">
          <div class="logo-wrapper bg-white p-1 mr-2 shadow-sm">
            <img :src="company.companyLogo" alt="Logo" width="45" height="45" />
          </div>
          <span class="brand-text font-weight-bold">{{ company.smsSender }}</span>
        </b-navbar-brand>

        <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav class="ml-4 nav-links">
            <b-nav-item :class="{ active: activeSection === 'dashboard' }" @click="activeSection = 'dashboard'">
              <b-icon icon="speedometer2" class="mr-1"></b-icon> Painel
            </b-nav-item>
            <b-nav-item :class="{ active: activeSection === 'customers' }" @click="activeSection = 'customers'">
              <b-icon icon="people" class="mr-1"></b-icon> Mutuários
            </b-nav-item>
            <b-nav-item :class="{ active: activeSection === 'prestacoes' }" @click="activeSection = 'prestacoes'">
              <b-icon icon="calendar-check" class="mr-1"></b-icon> Prestações
            </b-nav-item>
            <b-nav-item :class="{ active: activeSection === 'pagamentos' }" @click="activeSection = 'pagamentos'">
              <b-icon icon="wallet2" class="mr-1"></b-icon> Pagamentos
            </b-nav-item>
            <b-nav-item :class="{ active: activeSection === 'borrower' }" @click="activeSection = 'borrower'" v-if="selectedCustomer">
              <b-icon icon="person-lines-fill" class="mr-1"></b-icon> {{ selectedCustomer.customerName.split(' ')[0] }}
            </b-nav-item>
          </b-navbar-nav>

          <b-navbar-nav class="ml-auto align-items-center">
            <!-- Sino de Notificações -->
            <b-nav-item-dropdown
              right
              no-caret
              class="notification-dropdown mr-2"
              @show="onNotificationDropdownShow"
            >
              <template #button-content>
                <div class="notification-bell position-relative">
                  <b-icon icon="bell-fill" font-scale="1.2" class="text-white"></b-icon>
                  <b-badge
                    v-if="notifUnreadCount > 0"
                    variant="danger"
                    pill
                    class="notification-badge"
                  >
                    {{ notifUnreadCount > 99 ? '99+' : notifUnreadCount }}
                  </b-badge>
                </div>
              </template>

              <b-dropdown-header class="d-flex justify-content-between align-items-center" style="min-width: 300px">
                <strong>Notificações</strong>
                <b-button
                  v-if="notifUnreadCount > 0"
                  variant="link"
                  size="sm"
                  class="p-0 text-success"
                  @click.stop="markAllNotifRead"
                >
                  <small>Marcar todas como lidas</small>
                </b-button>
              </b-dropdown-header>

              <b-dropdown-divider></b-dropdown-divider>

              <div style="max-height: 350px; overflow-y: auto; width: 340px">
                <div v-if="notifList.length === 0" class="text-center py-4">
                  <b-icon icon="bell-slash" font-scale="2" class="text-muted mb-2 d-block mx-auto"></b-icon>
                  <small class="text-muted">Sem notificações</small>
                </div>

                <b-dropdown-item-button
                  v-for="notif in notifList"
                  :key="notif.id"
                  class="notification-item"
                  :class="{ 'unread-notif': !notif.isRead }"
                  @click="onNotifClick(notif)"
                >
                  <div class="d-flex align-items-start">
                    <div class="notif-icon mr-2 mt-1" :class="'notif-type-' + notif.type">
                      <b-icon :icon="getNotifIcon(notif.type)" font-scale="0.85"></b-icon>
                    </div>
                    <div class="flex-grow-1" style="min-width: 0">
                      <div class="font-weight-bold small text-truncate" style="color: #333">{{ notif.title }}</div>
                      <small class="text-muted d-block text-truncate">{{ notif.message }}</small>
                      <small class="text-muted" style="font-size: 0.7rem">{{ notifTimeAgo(notif.createdAt) }}</small>
                    </div>
                    <div v-if="!notif.isRead" class="ml-2 mt-1">
                      <span class="unread-dot-green"></span>
                    </div>
                  </div>
                </b-dropdown-item-button>
              </div>

              <b-dropdown-divider></b-dropdown-divider>
              <b-dropdown-item-button @click="activeSection = 'notificacoes'" class="text-center">
                <small class="font-weight-bold" style="color: #009640">Ver todas as notificações</small>
              </b-dropdown-item-button>
            </b-nav-item-dropdown>

            <b-nav-item-dropdown right no-caret class="profile-dropdown">
              <template #button-content>
                <div class="user-badge d-flex align-items-center px-3 py-1">
                  <div class="text-right mr-2 d-none d-md-block">
                    <small class="d-block text-light opacity-75">Gestor de Crédito</small>
                    <span class="font-weight-bold">{{ user.name }}</span>
                  </div>
                  <b-avatar variant="light" size="2.2rem" class="text-mbr-green">
                    <b-icon icon="person-fill"></b-icon>
                  </b-avatar>
                </div>
              </template>
              <b-dropdown-header class="text-uppercase small font-weight-bold">Minha Conta</b-dropdown-header>
              <b-dropdown-item to="/profile">
                <b-icon icon="person-circle" class="mr-2"></b-icon> Meu Perfil
              </b-dropdown-item>
              <b-dropdown-divider></b-dropdown-divider>
              <b-dropdown-item @click="logoutUser()" variant="danger">
                <b-icon icon="power" class="mr-2"></b-icon> Sair do Sistema
              </b-dropdown-item>
            </b-nav-item-dropdown>
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>

    <div style="margin-top: 75px"></div>

    <b-container fluid class="py-4">
      <b-overlay :show="isLoading" rounded="lg" opacity="0.6">

        <!-- ═══════════════ SECÇÃO: DASHBOARD ═══════════════ -->
        <div v-if="activeSection === 'dashboard'">
          <b-row class="mb-4 align-items-center">
            <b-col md="6">
              <h4 class="text-dark font-weight-bold mb-1">Meu Painel</h4>
              <p class="text-muted small mb-0">
                <b-icon icon="calendar3" class="mr-1"></b-icon>
                {{ todayFormatted }} | Bem-vindo, {{ user.name }}
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
                  <b-button variant="outline-secondary" size="sm" class="mr-1" @click="clearDashboardPeriodFilter">
                    Limpar
                  </b-button>
                  <b-button variant="mbr-green" size="sm" class="shadow-sm mr-1" @click="applyDashboardPeriodFilter">
                    <b-icon icon="search" class="mr-1"></b-icon> Aplicar
                  </b-button>
                  <b-button variant="mbr-green" size="sm" class="shadow-sm" @click="refreshData">
                    <b-icon icon="arrow-repeat" class="mr-1"></b-icon> Actualizar
                  </b-button>
                </b-col>
              </b-row>
            </b-col>
          </b-row>

          <b-row v-if="hasDashboardFilter" class="mb-3">
            <b-col>
              <div class="filter-active-pill">
                <b-icon icon="funnel-fill" class="mr-2"></b-icon>
                Filtro ativo: {{ dashboardRangeLabel }}
              </div>
            </b-col>
          </b-row>

          <!-- KPIs -->
          <b-row class="mb-4">
            <b-col lg="3" md="6" class="mb-3">
              <b-card no-body class="stat-card border-0 shadow-sm" @click="activeSection = 'customers'">
                <div class="d-flex align-items-center p-3">
                  <div class="icon-shape bg-soft-info mr-3">
                    <b-icon icon="people-fill" class="text-info"></b-icon>
                  </div>
                  <div>
                    <div class="kpi-label">Mutuários</div>
                    <h3 class="font-weight-bold mb-0 text-dark">{{ customersPagination.totalItems }}</h3>
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
                    <div class="kpi-label">Meus Desembolsos</div>
                    <h3 class="font-weight-bold mb-0 text-mbr-green">{{ formatMoney(myDisbursedDisplay) }}</h3>
                  </div>
                </div>
              </b-card>
            </b-col>

            <b-col lg="3" md="6" class="mb-3">
              <b-card no-body class="stat-card border-0 shadow-sm">
                <div class="d-flex align-items-center p-3">
                  <div class="icon-shape bg-soft-warning mr-3">
                    <b-icon icon="clock-history" class="text-warning"></b-icon>
                  </div>
                  <div>
                    <div class="kpi-label">Pendentes</div>
                    <h3 class="font-weight-bold mb-0 text-dark">{{ myPendingCountDisplay }}</h3>
                  </div>
                </div>
              </b-card>
            </b-col>

            <b-col lg="3" md="6" class="mb-3">
              <b-card no-body class="stat-card border-0 shadow-sm">
                <div class="d-flex align-items-center p-3">
                  <div class="icon-shape bg-soft-success mr-3">
                    <b-icon icon="check-circle-fill" class="text-success"></b-icon>
                  </div>
                  <div>
                    <div class="kpi-label">Créditos Activos</div>
                    <h3 class="font-weight-bold mb-0 text-dark">{{ myActiveCountDisplay }}</h3>
                  </div>
                </div>
              </b-card>
            </b-col>
          </b-row>

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
                    {{ Number(dashboardDelinquency.overdueRate || 0).toFixed(2) }}%
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
                  <h5 class="font-weight-bold mb-0 text-dark">{{ formatMoney(dashboardDelinquency.par30Amount || 0) }}</h5>
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
                  <h5 class="font-weight-bold mb-0 text-dark">{{ formatMoney(dashboardDelinquency.par60Amount || 0) }}</h5>
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
                  <h5 class="font-weight-bold mb-0 text-dark">{{ formatMoney(dashboardDelinquency.par90Amount || 0) }}</h5>
                </div>
              </b-card>
            </b-col>
          </b-row>

          <!-- Tabela de créditos do gestor -->
          <b-card class="border-0 shadow-sm">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="font-weight-bold text-mbr-green mb-0">
                <b-icon icon="list-ul" class="mr-1"></b-icon>
                Meus Créditos ({{ myLoansDisplay.length }})
              </h6>
            </div>
            <div v-if="myLoansDisplay.length === 0" class="text-center py-5 text-muted">
              <b-icon icon="inbox" font-scale="3" class="mb-3"></b-icon>
              <p>Nenhum crédito atribuído.</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover table-sm align-middle mb-0">
                <thead class="bg-light text-secondary">
                  <tr style="font-size: 0.85rem">
                    <th>Mutuário</th>
                    <th class="text-right">Montante</th>
                    <th class="text-center">Prestações</th>
                    <th class="text-center">Taxa</th>
                    <th class="text-center">Estado</th>
                    <th class="text-center">Data</th>
                    <th class="text-center">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="loan in myLoansDisplay" :key="loan.id">
                    <td>
                      <strong class="text-dark">{{ getCustomerName(loan.accountNumber) }}</strong>
                      <br /><small class="text-muted">Conta: {{ loan.accountNumber }}</small>
                    </td>
                    <td class="text-right font-weight-bold">{{ formatMoney(loan.amount) }}</td>
                    <td class="text-center">{{ loan.numberOfInstallments }}</td>
                    <td class="text-center">{{ (loan.interestRate * 100).toFixed(0) }}%</td>
                    <td class="text-center">
                      <b-badge :variant="loanStatusVariant(loan.status)" pill>{{ loanStatusLabel(loan.status) }}</b-badge>
                    </td>
                    <td class="text-center">
                      <small>{{ formatDate(loan.dateCreated || loan.createdAt) }}</small>
                    </td>
                    <td class="text-center">
                      <b-button size="sm" variant="link" class="text-info p-1" @click="openBorrowerFromLoan(loan)">
                        <b-icon icon="eye"></b-icon>
                      </b-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </b-card>
        </div>

        <!-- ═══════════════ SECÇÃO: MUTUÁRIOS ═══════════════ -->
        <div v-if="activeSection === 'customers'">
          <b-row>
            <!-- Lista de Mutuários -->
            <b-col lg="8" md="12" class="mb-4">
              <b-card no-body class="shadow-sm border-0 h-100">
                <b-card-header class="bg-white border-bottom-0 pt-4 px-4">
                  <b-row align-v="center">
                    <b-col md="4">
                      <h5 class="text-mbr-green font-weight-bold mb-0">
                        <b-icon icon="people-fill" class="mr-2"></b-icon>
                        Mutuários: {{ customersPagination.totalItems }}
                      </h5>
                    </b-col>
                    <b-col md="4">
                      <b-input-group size="sm">
                        <b-input-group-prepend is-text class="bg-light border-right-0">
                          <b-icon icon="search" variant="secondary"></b-icon>
                        </b-input-group-prepend>
                        <b-form-input type="text" class="border-left-0 bg-light" @input="onSearchInput" v-model="searchValues" placeholder="Pesquisar por nome, telefone, NUIT..."></b-form-input>
                        <b-input-group-append v-if="searchValues">
                          <b-button variant="outline-secondary" size="sm" @click="clearSearch" title="Limpar pesquisa">
                            <b-icon icon="x"></b-icon>
                          </b-button>
                        </b-input-group-append>
                      </b-input-group>
                    </b-col>
                    <b-col md="4" class="text-right">
                      <b-button size="sm" variant="outline-secondary" @click="refreshCustomers" title="Actualizar">
                        <b-icon icon="arrow-clockwise"></b-icon>
                      </b-button>
                    </b-col>
                  </b-row>
                </b-card-header>

                <b-card-body class="px-0">
                  <div v-if="customers.length === 0" class="text-center py-5 text-muted">
                    <b-icon icon="inbox" font-scale="3" class="mb-3"></b-icon>
                    <p>Nenhum mutuário encontrado.</p>
                  </div>
                  <div v-else class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="bg-light text-secondary">
                        <tr style="font-size: 0.9rem">
                          <th class="pl-4 border-top-0">Nome Completo</th>
                          <th class="border-top-0">Nº Mutuário</th>
                          <th class="border-top-0">Telefone</th>
                          <th class="text-center border-top-0">Estado</th>
                          <th class="text-center border-top-0" width="150">Acções</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="customer in customers" :key="customer.id" class="cursor-pointer" :class="{ 'table-warning': customerForm.id === customer.id }" @click="editCustomer(customer)">
                          <td class="pl-4">
                            <div class="font-weight-bold text-dark">{{ customer.customerName }}</div>
                            <small class="text-muted">{{ customer.customerEmail }}</small>
                          </td>
                          <td class="align-middle">
                            <span class="badge badge-light border">{{ customer.accountNumber }}</span>
                          </td>
                          <td class="align-middle">{{ customer.customerPhone }}</td>
                          <td class="text-center align-middle">
                            <b-badge :variant="customer.customerStatus == 0 ? 'success' : 'danger'" pill>
                              {{ customer.customerStatus == 0 ? 'Activo' : 'Desabilitado' }}
                            </b-badge>
                          </td>
                          <td class="text-center align-middle">
                            <b-button size="sm" variant="link" class="text-mbr-green p-1" @click.stop="editCustomer(customer)" title="Editar">
                              <b-icon icon="pencil-square"></b-icon>
                            </b-button>
                            <b-button size="sm" variant="link" class="text-info p-1" @click.stop="openBorrower(customer)" title="Abrir painel">
                              <b-icon icon="eye"></b-icon>
                            </b-button>
                            <b-button size="sm" variant="link" class="p-1" :class="customer.customerStatus == 0 ? 'text-danger' : 'text-success'" @click.stop="toggleCustomerStatus(customer)" :title="customer.customerStatus == 0 ? 'Desabilitar' : 'Habilitar'">
                              <b-icon :icon="customer.customerStatus == 0 ? 'person-dash' : 'person-check'"></b-icon>
                            </b-button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!-- Controles de Paginação -->
                  <div
                    v-if="customersPagination.totalPages > 0"
                    class="d-flex justify-content-between align-items-center px-4 py-3 border-top"
                  >
                    <div class="d-flex align-items-center">
                      <small class="text-muted mr-2">Mostrar</small>
                      <b-form-select
                        size="sm"
                        v-model="perPage"
                        :options="perPageOptions"
                        style="width: 75px"
                        @change="onPerPageChange"
                      ></b-form-select>
                      <small class="text-muted ml-2">por página</small>
                    </div>

                    <div class="text-center">
                      <small class="text-muted">
                        Mostrando
                        <strong>{{ paginationStart }}</strong> -
                        <strong>{{ paginationEnd }}</strong>
                        de
                        <strong>{{ customersPagination.totalItems }}</strong>
                        mutuários
                      </small>
                    </div>

                    <nav aria-label="Navegação de páginas">
                      <ul class="pagination pagination-sm mb-0">
                        <li class="page-item" :class="{ disabled: !customersPagination.hasPrevPage }">
                          <a class="page-link" href="#" @click.prevent="goToPage(1)" title="Primeira">
                            <b-icon icon="chevron-double-left" font-scale="0.8"></b-icon>
                          </a>
                        </li>
                        <li class="page-item" :class="{ disabled: !customersPagination.hasPrevPage }">
                          <a class="page-link" href="#" @click.prevent="goToPage(customersPagination.currentPage - 1)" title="Anterior">
                            <b-icon icon="chevron-left" font-scale="0.8"></b-icon>
                          </a>
                        </li>
                        <li v-for="page in visiblePages" :key="page" class="page-item" :class="{ active: page === customersPagination.currentPage }">
                          <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
                        </li>
                        <li class="page-item" :class="{ disabled: !customersPagination.hasNextPage }">
                          <a class="page-link" href="#" @click.prevent="goToPage(customersPagination.currentPage + 1)" title="Próxima">
                            <b-icon icon="chevron-right" font-scale="0.8"></b-icon>
                          </a>
                        </li>
                        <li class="page-item" :class="{ disabled: !customersPagination.hasNextPage }">
                          <a class="page-link" href="#" @click.prevent="goToPage(customersPagination.totalPages)" title="Última">
                            <b-icon icon="chevron-double-right" font-scale="0.8"></b-icon>
                          </a>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </b-card-body>
              </b-card>
            </b-col>

            <!-- Formulário de Cadastro/Edição -->
            <b-col lg="4" md="12">
              <b-card class="shadow-sm border-0 sticky-top" style="top: 90px; z-index: 1">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="font-weight-bold text-mbr-green mb-0">
                    <b-icon icon="person-plus-fill" class="mr-1"></b-icon>
                    {{ customerUpdationId === 0 ? 'Novo Mutuário' : 'Editar Mutuário' }}
                  </h6>
                  <b-button v-if="customerUpdationId !== 0" size="sm" variant="light" @click="resetCustomerForm()">Cancelar</b-button>
                </div>

                <b-form @submit.prevent="registerOrUpdateCustomer">
                  <div class="section-label">Dados Pessoais</div>
                  <b-form-group class="mb-2">
                    <small class="form-field-label">Nome completo</small>
                    <b-form-input size="sm" v-model="customerForm.customerName" placeholder="Ex.: Ana Maria Silva" required></b-form-input>
                  </b-form-group>
                  <b-row class="mb-2">
                    <b-col cols="6" class="pr-1">
                      <small class="form-field-label">Sexo</small>
                      <b-form-select size="sm" v-model="customerForm.sex" :options="genderOptions" required></b-form-select>
                    </b-col>
                    <b-col cols="6" class="pl-1">
                      <small class="form-field-label">Data de nascimento</small>
                      <b-form-input type="date" size="sm" v-model="customerForm.customerDateOfBirth" placeholder="AAAA-MM-DD"></b-form-input>
                    </b-col>
                  </b-row>

                  <div class="section-label mt-3">Contactos</div>
                  <b-row class="mb-2">
                    <b-col cols="6" class="pr-1">
                      <small class="form-field-label">Telemóvel principal</small>
                      <b-form-input type="tel" size="sm" v-model="customerForm.customerPhone" placeholder="Ex.: 84XXXXXXX" required></b-form-input>
                    </b-col>
                    <b-col cols="6" class="pl-1">
                      <small class="form-field-label">E-mail</small>
                      <b-form-input type="email" size="sm" v-model="customerForm.customerEmail" placeholder="Ex.: cliente@email.com"></b-form-input>
                    </b-col>
                  </b-row>
                  <b-form-group class="mb-2">
                    <small class="form-field-label">Endereço / residência</small>
                    <b-form-input size="sm" v-model="customerForm.customerAddress" placeholder="Ex.: Bairro, Rua, nº"></b-form-input>
                  </b-form-group>

                  <div class="section-label mt-3">Documentação</div>
                  <b-row class="mb-2">
                    <b-col cols="6" class="pr-1">
                      <small class="form-field-label">NUIT</small>
                      <b-form-input size="sm" v-model="customerForm.customerNuit" placeholder="Ex.: 123456789"></b-form-input>
                    </b-col>
                    <b-col cols="6" class="pl-1">
                      <small class="form-field-label">Nº BI/Passaporte</small>
                      <b-form-input size="sm" v-model="customerForm.customerNationalId" placeholder="Ex.: 123456789A"></b-form-input>
                    </b-col>
                  </b-row>
                  <b-row class="mb-2">
                    <b-col cols="6" class="pr-1">
                      <small class="form-field-label">Data de emissão</small>
                      <b-form-input type="date" size="sm" v-model="customerForm.issuedAt" placeholder="AAAA-MM-DD"></b-form-input>
                    </b-col>
                    <b-col cols="6" class="pl-1">
                      <small class="form-field-label">Local de emissão</small>
                      <b-form-input size="sm" v-model="customerForm.localOfIssue" placeholder="Ex.: Maputo"></b-form-input>
                    </b-col>
                  </b-row>

                  <div class="section-label mt-3">Dados Profissionais</div>
                  <b-row class="mb-2">
                    <b-col cols="6" class="pr-1">
                      <small class="form-field-label">Profissão</small>
                      <b-form-input size="sm" v-model="customerForm.customerProfession" placeholder="Ex.: Comerciante"></b-form-input>
                    </b-col>
                    <b-col cols="6" class="pl-1">
                      <small class="form-field-label">Rendimento mensal</small>
                      <b-input-group size="sm">
                        <b-input-group-prepend is-text class="px-1 text-muted">MZN</b-input-group-prepend>
                        <b-form-input type="number" v-model="customerForm.customerMonthlySalary" placeholder="Ex.: 15000"></b-form-input>
                      </b-input-group>
                    </b-col>
                  </b-row>
                  <b-form-group class="mb-2">
                    <small class="form-field-label">Entidade patronal / local de trabalho</small>
                    <b-form-input size="sm" v-model="customerForm.customerLocalOfWork" placeholder="Ex.: Empresa X"></b-form-input>
                  </b-form-group>

                  <div class="section-label mt-3">Familiar / Emergência</div>
                  <b-form-group class="mb-2">
                    <small class="form-field-label">Estado civil</small>
                    <b-form-select size="sm" v-model="customerForm.maritalStatus" :options="maritalStatusOptions" required></b-form-select>
                  </b-form-group>
                  <div v-if="customerForm.maritalStatus === 'casado'" class="bg-light p-2 rounded mb-2">
                    <small class="form-field-label">Nome do cônjuge</small>
                    <b-form-input size="sm" class="mb-1" v-model="customerForm.customerSpouseName" placeholder="Ex.: Maria Silva"></b-form-input>
                    <small class="form-field-label">Contacto do cônjuge</small>
                    <b-form-input size="sm" v-model="customerForm.customerSpouseContact" placeholder="Ex.: 84XXXXXXX"></b-form-input>
                  </div>
                  <div v-if="customerForm.maritalStatus && customerForm.maritalStatus !== 'casado'" class="bg-light p-2 rounded mb-2">
                    <small class="form-field-label">Pessoa de contacto</small>
                    <b-form-input size="sm" class="mb-1" v-model="customerForm.customerEmergencyPerson" placeholder="Ex.: João Silva"></b-form-input>
                    <small class="form-field-label">Telefone de emergência</small>
                    <b-form-input size="sm" v-model="customerForm.customerEmergencyContact" placeholder="Ex.: 84XXXXXXX"></b-form-input>
                  </div>

                  <div class="mt-4 pt-2 border-top">
                    <b-row>
                      <b-col cols="5">
                        <b-button block variant="outline-secondary" size="sm" @click="resetCustomerForm" :disabled="isLoading">Limpar</b-button>
                      </b-col>
                      <b-col cols="7">
                        <b-button block class="btn-mbr-primary text-white border-0" size="sm" type="submit" :disabled="isLoading">
                          <b-icon icon="check2-circle"></b-icon>
                          {{ customerUpdationId === 0 ? 'Cadastrar' : 'Salvar' }}
                        </b-button>
                      </b-col>
                    </b-row>
                  </div>
                </b-form>
              </b-card>
            </b-col>
          </b-row>
        </div>

        <!-- ═══════════════ SECÇÃO: PAINEL DO MUTUÁRIO (BORROWER) ═══════════════ -->
        <div v-if="activeSection === 'borrower' && selectedCustomer">
          <!-- Header do Cliente -->
          <b-card class="mb-3 border-0 shadow-sm borrower-header-card" no-body>
            <b-card-body class="py-3 px-4">
              <b-row align-v="center">
                <b-col cols="auto">
                  <div class="customer-avatar">
                    <b-icon icon="person-fill" font-scale="1.8"></b-icon>
                  </div>
                </b-col>
                <b-col>
                  <h5 class="mb-0 font-weight-bold">{{ selectedCustomer.customerName }}</h5>
                  <small class="text-muted d-block">
                    <b-icon icon="credit-card" class="mr-1"></b-icon>
                    Conta: <strong>{{ selectedCustomer.accountNumber }}</strong>
                  </small>
                  <div class="mt-2 d-flex align-items-center flex-wrap" style="gap: 8px;">
                    <b-badge
                      pill
                      :variant="borrowerStatusVariant"
                      class="px-2 py-1"
                    >
                      <b-icon :icon="borrowerStatusVariant === 'success' ? 'person-check-fill' : 'person-dash-fill'" class="mr-1"></b-icon>
                      {{ borrowerStatusLabel }}
                    </b-badge>
                    <small class="text-muted">
                      <b-icon icon="telephone-fill" class="mr-1"></b-icon>
                      {{ selectedCustomer.customerPhone || "Sem telefone" }}
                    </small>
                    <small class="text-muted">
                      <b-icon icon="envelope-fill" class="mr-1"></b-icon>
                      {{ selectedCustomer.customerEmail || "Sem e-mail" }}
                    </small>
                  </div>
                </b-col>
                <b-col cols="auto" class="text-right">
                  <small class="text-muted d-block">Rendimento mensal</small>
                  <span class="font-weight-bold text-mbr-green d-block">
                    {{ formatMoney(selectedCustomer.customerMonthlySalary) }}
                  </span>
                  <small class="text-muted">
                    <b-icon icon="briefcase-fill" class="mr-1"></b-icon>
                    {{ selectedCustomer.customerProfession || "Profissão não informada" }}
                  </small>
                </b-col>
                <b-col cols="auto" v-if="borrowerAmortization.length > 0">
                  <b-badge :variant="borrowerElegibility ? 'success' : 'warning'" class="px-3 py-2">
                    <b-icon :icon="borrowerElegibility ? 'check-circle-fill' : 'exclamation-triangle-fill'" class="mr-1"></b-icon>
                    {{ borrowerElegibility ? 'Elegível' : 'Capacidade excedida' }}
                  </b-badge>
                </b-col>
              </b-row>

              <b-row class="mt-3">
                <b-col lg="3" md="6" class="mb-2">
                  <div class="borrower-mini-stat">
                    <small class="borrower-mini-label">Créditos registados</small>
                    <strong class="borrower-mini-value">{{ borrowerLoansCount }}</strong>
                  </div>
                </b-col>
                <b-col lg="3" md="6" class="mb-2">
                  <div class="borrower-mini-stat">
                    <small class="borrower-mini-label">Créditos activos</small>
                    <strong class="borrower-mini-value text-success">{{ borrowerActiveLoansCount }}</strong>
                  </div>
                </b-col>
                <b-col lg="3" md="6" class="mb-2">
                  <div class="borrower-mini-stat">
                    <small class="borrower-mini-label">Documentos</small>
                    <strong class="borrower-mini-value">{{ borrowerDocuments.length }}</strong>
                  </div>
                </b-col>
                <b-col lg="3" md="6" class="mb-2">
                  <div class="borrower-mini-stat">
                    <small class="borrower-mini-label">Prestação simulada</small>
                    <strong class="borrower-mini-value text-primary">
                      {{ borrowerEstimatedInstallment > 0 ? formatMoney(borrowerEstimatedInstallment) : "—" }}
                    </strong>
                  </div>
                </b-col>
              </b-row>
            </b-card-body>
          </b-card>

          <b-row>
            <!-- Coluna esquerda: Documentos -->
            <b-col lg="3" md="4" sm="12">
              <!-- Upload de Documentos -->
              <b-card class="border-0 shadow-sm mb-3" no-body>
                <b-card-header class="section-header">
                  <b-icon icon="file-earmark-plus" class="mr-2"></b-icon>
                  Adicionar Documentos
                </b-card-header>
                <b-card-body>
                  <b-form-group label="Tipo de documento" label-size="sm" class="mb-2">
                    <b-form-select size="sm" v-model="docForm.documentName" :options="documentTypeOptions"></b-form-select>
                  </b-form-group>
                  <b-form-group label="Selecionar ficheiro" label-size="sm" class="mb-2">
                    <b-form-file accept="*" @change="onFileChange" size="sm" placeholder="Escolher ficheiro..." drop-placeholder="Arraste o ficheiro aqui..."></b-form-file>
                  </b-form-group>
                  <b-progress :value="uploadValue" :max="100" show-progress animated class="mb-2" variant="info" v-if="uploadValue > 0"></b-progress>
                  <b-button :disabled="isLoading || uploadValue > 0 || !selectedFile || !docForm.documentName" size="sm" variant="secondary" @click="onUploadFile()" block>
                    <b-icon icon="cloud-upload-fill" class="mr-1"></b-icon>
                    Salvar documento
                  </b-button>
                </b-card-body>
              </b-card>

              <!-- Documentos Submetidos -->
              <b-card class="border-0 shadow-sm mb-3" no-body>
                <b-card-header class="section-header">
                  <b-icon icon="list-check" class="mr-2"></b-icon>
                  Documentos
                  <b-badge variant="secondary" pill class="ml-2">{{ borrowerDocuments.length }}</b-badge>
                </b-card-header>
                <div v-if="borrowerDocuments.length === 0" class="text-center py-4 px-3 text-muted">
                  <b-icon icon="file-earmark-x" font-scale="1.6" class="mb-2"></b-icon>
                  <div class="small">Nenhum documento submetido</div>
                </div>
                <b-list-group v-else flush>
                  <b-list-group-item
                    class="d-flex justify-content-between align-items-center borrower-doc-item"
                    v-for="(doc, index) in borrowerDocuments"
                    :key="doc.id"
                  >
                    <div class="pr-2">
                      <small class="text-muted mr-1">{{ index + 1 }}.</small>
                      <small class="font-weight-bold d-block text-dark">{{ doc.documentName }}</small>
                      <small class="text-muted">
                        {{ doc.createdAt ? `Submetido em ${formatDate(doc.createdAt)}` : "Data de submissão indisponível" }}
                      </small>
                    </div>
                    <div class="d-flex align-items-center" style="gap: 6px;">
                      <a :href="buildDocumentLink(doc.documentFileUrl)" target="_blank" class="text-decoration-none">
                        <b-button variant="outline-secondary" size="sm" class="p-1" v-b-tooltip.hover title="Abrir/transferir">
                          <b-icon icon="box-arrow-up-right" font-scale="0.8"></b-icon>
                        </b-button>
                      </a>
                      <b-button
                        variant="outline-danger"
                        size="sm"
                        class="p-1"
                        v-b-tooltip.hover
                        title="Eliminar documento"
                        @click="deleteDocument(doc)"
                      >
                        <b-icon icon="trash-fill" font-scale="0.8"></b-icon>
                      </b-button>
                    </div>
                  </b-list-group-item>
                </b-list-group>
              </b-card>
            </b-col>

            <!-- Coluna direita: Simulação, Crédito, Histórico -->
            <b-col lg="9" md="8" sm="12">
              <!-- Simulação de Crédito -->
              <b-card class="border-0 shadow-sm mb-3" no-body>
                <b-card-header class="section-header d-flex justify-content-between align-items-center">
                  <div>
                    <b-icon icon="calculator" class="mr-2"></b-icon>
                    Simulação de Crédito
                    <small class="d-block text-muted font-weight-normal mt-1">
                      Defina valor, prazo e taxa para validar capacidade de pagamento.
                    </small>
                  </div>
                  <b-button variant="mbr-green" size="sm" @click="previewSimulator()">
                    <b-icon icon="play-fill" class="mr-1"></b-icon> Simular
                  </b-button>
                </b-card-header>
                <b-card-body class="borrower-simulation-body">
                  <b-row>
                    <b-col lg="6" md="6" sm="12" class="mb-2">
                      <b-form-group label="Montante do crédito (MZN)" label-size="sm" class="mb-0">
                        <b-form-input type="number" min="100" step="any" size="sm" v-model="loanForm.capital" placeholder="Min. 100.00 MZN"></b-form-input>
                      </b-form-group>
                    </b-col>
                    <b-col lg="3" md="3" sm="6" class="mb-2">
                      <b-form-group label="N. de prestações" label-size="sm" class="mb-0">
                        <b-form-select v-model="loanForm.prestacoes" size="sm" :options="numeroPrestacoes" required></b-form-select>
                      </b-form-group>
                    </b-col>
                    <b-col lg="3" md="3" sm="6" class="mb-2">
                      <b-form-group label="Taxa de juros" label-size="sm" class="mb-0">
                        <b-form-select v-model="loanForm.juros" size="sm" :options="typeOfCredit" required></b-form-select>
                      </b-form-group>
                    </b-col>
                  </b-row>
                  <div class="borrower-capacity-strip mt-3">
                    <div class="capacity-item">
                      <small class="capacity-label">Capacidade máxima (1/3)</small>
                      <strong class="capacity-value">{{ formatMoney(maxBorrowerInstallmentCapacity) }}</strong>
                    </div>
                    <div class="capacity-item">
                      <small class="capacity-label">Prestação simulada</small>
                      <strong class="capacity-value">{{ borrowerEstimatedInstallment > 0 ? formatMoney(borrowerEstimatedInstallment) : "—" }}</strong>
                    </div>
                    <div class="capacity-item">
                      <small class="capacity-label">Margem</small>
                      <strong class="capacity-value" :class="borrowerInstallmentDeltaClass">
                        {{ borrowerEstimatedInstallment > 0 ? formatMoney(Math.abs(borrowerInstallmentDelta)) : "—" }}
                      </strong>
                    </div>
                  </div>
                </b-card-body>
              </b-card>

              <!-- Plano de Amortização -->
              <b-card class="border-0 shadow-sm mb-3" no-body v-if="borrowerAmortization.length > 0">
                <b-card-header class="section-header d-flex justify-content-between align-items-center">
                  <div>
                    <b-icon icon="table" class="mr-2"></b-icon> Plano de Amortização
                  </div>
                  <b-button variant="outline-secondary" size="sm" @click="borrowerAmortization = []">
                    <b-icon icon="x-lg" class="mr-1"></b-icon> Fechar
                  </b-button>
                </b-card-header>
                <b-card-body>
                  <b-row class="mb-3">
                    <b-col lg="3" md="6" class="mb-2">
                      <div class="summary-card summary-capital">
                        <small class="summary-label">Capital</small>
                        <strong class="summary-value">{{ formatMoney(loanForm.capital) }}</strong>
                      </div>
                    </b-col>
                    <b-col lg="3" md="6" class="mb-2">
                      <div class="summary-card summary-rate">
                        <small class="summary-label">Taxa de juros</small>
                        <strong class="summary-value">{{ loanForm.juros * 100 }}%</strong>
                      </div>
                    </b-col>
                    <b-col lg="3" md="6" class="mb-2">
                      <div class="summary-card summary-installments">
                        <small class="summary-label">Prestações</small>
                        <strong class="summary-value">{{ loanForm.prestacoes }}</strong>
                      </div>
                    </b-col>
                    <b-col lg="3" md="6" class="mb-2">
                      <div class="summary-card summary-total">
                        <small class="summary-label">Total a pagar</small>
                        <strong class="summary-value">{{ formatMoney(borrowerTotal2Pay) }}</strong>
                      </div>
                    </b-col>
                  </b-row>
                  <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0 borrower-amortization-table">
                      <thead>
                        <tr class="bg-light">
                          <th>Ordem</th>
                          <th class="text-right">Amortização</th>
                          <th class="text-right">Juros</th>
                          <th class="text-right">Prestação</th>
                          <th class="text-right">Saldo Devedor</th>
                          <th class="text-right">Vencimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="a in borrowerAmortization" :key="a.id">
                          <td>{{ a.installmentOrder }}</td>
                          <td class="text-right">{{ formatMoney(a.capitalPerInstall) }}</td>
                          <td class="text-right">{{ formatMoney(a.rateAmount) }}</td>
                          <td class="text-right">{{ formatMoney(a.installment) }}</td>
                          <td class="text-right">{{ a.remainingBalance != null ? formatMoney(a.remainingBalance) : '-' }}</td>
                          <td class="text-right">{{ formatDate(a.dueDate) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </b-card-body>
              </b-card>

              <!-- Submissão do Crédito -->
              <b-card class="border-0 shadow-sm mb-3" no-body v-if="borrowerAmortization.length > 0">
                <b-card-header class="section-header">
                  <b-icon icon="send" class="mr-2"></b-icon> Submissão do Crédito
                </b-card-header>
                <b-card-body>
                  <b-row>
                    <b-col lg="6" md="12" class="mb-2">
                      <b-form-group label="Parecer técnico" label-size="sm" label-class="font-weight-bold" class="mb-0">
                        <b-form-textarea v-model="loanForm.loanDescription" placeholder="Observações e parecer técnico..." rows="3" size="sm"></b-form-textarea>
                      </b-form-group>
                    </b-col>
                    <b-col lg="6" md="12" class="mb-2">
                      <div class="submission-guidance p-3 h-100">
                        <div class="font-weight-bold text-dark mb-2">
                          <b-icon icon="shield-check" class="mr-1 text-success"></b-icon>
                          Verificação antes da submissão
                        </div>
                        <small class="d-block text-muted mb-1">
                          Limite recomendado: {{ formatMoney(maxBorrowerInstallmentCapacity) }}
                        </small>
                        <small class="d-block" :class="borrowerInstallmentDeltaClass">
                          {{
                            borrowerInstallmentDelta >= 0
                              ? `Margem disponível: ${formatMoney(borrowerInstallmentDelta)}`
                              : `Excesso sobre limite: ${formatMoney(Math.abs(borrowerInstallmentDelta))}`
                          }}
                        </small>
                      </div>
                    </b-col>
                  </b-row>
                  <hr class="my-2" />
                  <div class="d-flex justify-content-end">
                    <b-button :disabled="isLoading" variant="outline-secondary" size="sm" class="mr-2" @click="borrowerAmortization = []">
                      <b-icon icon="x-lg" class="mr-1"></b-icon> Cancelar
                    </b-button>
                    <b-button :disabled="isLoading || !borrowerElegibility" variant="success" size="sm" @click="createLoan()" v-b-tooltip.hover :title="!borrowerElegibility ? 'Prestação excede 1/3 do rendimento' : ''">
                      <b-icon icon="telegram" class="mr-1"></b-icon> Submeter Crédito
                    </b-button>
                  </div>
                </b-card-body>
              </b-card>

              <!-- Histórico de Empréstimos -->
              <b-card class="border-0 shadow-sm mb-3" no-body>
                <b-card-header class="section-header d-flex justify-content-between align-items-center flex-wrap">
                  <div>
                    <b-icon icon="clock-history" class="mr-2"></b-icon> Histórico de Empréstimos
                    <small class="d-block text-muted font-weight-normal mt-1">
                      Linha temporal dos créditos do mutuário selecionado.
                    </small>
                  </div>
                  <b-badge variant="secondary" pill class="px-2 py-1 mt-2 mt-md-0">
                    {{ customerLoans.length }} registo(s)
                  </b-badge>
                </b-card-header>
                <b-card-body v-if="customerLoans.length > 0" class="p-0 borrower-history-body">
                  <LoansItems />
                </b-card-body>
                <b-card-body v-else class="text-center py-4 text-muted">
                  <b-icon icon="journal-x" font-scale="1.5" class="mb-2"></b-icon>
                  <div class="small">Ainda não há créditos registados para este mutuário.</div>
                </b-card-body>
              </b-card>
            </b-col>
          </b-row>
        </div>

        <!-- ═══════════════ SECÇÃO: PRESTAÇÕES PRÓXIMAS ═══════════════ -->
        <div v-if="activeSection === 'prestacoes'">
          <b-row class="mb-4 align-items-center">
            <b-col md="6">
              <h4 class="text-dark font-weight-bold mb-1">
                <b-icon icon="calendar-check" class="text-mbr-green mr-2"></b-icon>
                Prestações Próximas
              </h4>
              <p class="text-muted small mb-0">Prestações dos créditos instruídos por si</p>
            </b-col>
            <b-col md="6" class="text-md-right mt-3 mt-md-0">
              <b-button variant="mbr-green" size="sm" class="shadow-sm" @click="syncMyInstallments()">
                <b-icon icon="arrow-repeat" class="mr-1"></b-icon> Actualizar
              </b-button>
            </b-col>
          </b-row>

          <!-- Filtros -->
          <b-card no-body class="border-0 shadow-sm mb-4">
            <b-card-body class="py-3">
              <b-row align-v="end">
                <b-col sm="2" class="mb-2 mb-sm-0">
                  <label class="small font-weight-bold text-secondary">De</label>
                  <b-form-datepicker v-model="instDateFrom" size="sm" locale="pt-PT" placeholder="Início" class="bg-light border-0" reset-button></b-form-datepicker>
                </b-col>
                <b-col sm="2" class="mb-2 mb-sm-0">
                  <label class="small font-weight-bold text-secondary">Até</label>
                  <b-form-datepicker v-model="instDateTo" size="sm" locale="pt-PT" placeholder="Fim" class="bg-light border-0" reset-button></b-form-datepicker>
                </b-col>
                <b-col sm="auto" class="mb-2 mb-sm-0">
                  <label class="small font-weight-bold text-secondary d-block">&nbsp;</label>
                  <b-form-radio-group v-model="instRangeFilter" buttons button-variant="outline-mbr" size="sm" class="mbr-radio-group">
                    <b-form-radio value="today">Hoje</b-form-radio>
                    <b-form-radio value="7">7 Dias</b-form-radio>
                    <b-form-radio value="30">30 Dias</b-form-radio>
                    <b-form-radio value="all">Todos</b-form-radio>
                  </b-form-radio-group>
                </b-col>
                <b-col sm="auto" v-if="instDateFrom || instDateTo">
                  <label class="small font-weight-bold text-secondary d-block">&nbsp;</label>
                  <b-button variant="outline-secondary" size="sm" @click="clearInstFilters()">
                    <b-icon icon="x-circle" class="mr-1"></b-icon> Limpar
                  </b-button>
                </b-col>
              </b-row>
            </b-card-body>
          </b-card>

          <!-- KPIs -->
          <b-row class="mb-4">
            <b-col lg="3" md="6" class="mb-3">
              <b-card no-body class="border-0 shadow-sm">
                <div class="d-flex align-items-center p-3">
                  <div class="icon-shape bg-soft-info mr-3"><b-icon icon="calendar-event" class="text-info"></b-icon></div>
                  <div><div class="kpi-label">Hoje</div><h3 class="font-weight-bold mb-0 text-dark">{{ myDueToday.length }}</h3></div>
                </div>
              </b-card>
            </b-col>
            <b-col lg="3" md="6" class="mb-3">
              <b-card no-body class="border-0 shadow-sm">
                <div class="d-flex align-items-center p-3">
                  <div class="icon-shape bg-soft-warning mr-3"><b-icon icon="calendar-week" class="text-warning"></b-icon></div>
                  <div><div class="kpi-label">7 Dias</div><h3 class="font-weight-bold mb-0 text-dark">{{ myUpcoming7.length }}</h3></div>
                </div>
              </b-card>
            </b-col>
            <b-col lg="3" md="6" class="mb-3">
              <b-card no-body class="border-0 shadow-sm">
                <div class="d-flex align-items-center p-3">
                  <div class="icon-shape bg-soft-success mr-3"><b-icon icon="calendar-range" class="text-success"></b-icon></div>
                  <div><div class="kpi-label">30 Dias</div><h3 class="font-weight-bold mb-0 text-dark">{{ myUpcoming30.length }}</h3></div>
                </div>
              </b-card>
            </b-col>
            <b-col lg="3" md="6" class="mb-3">
              <b-card no-body class="border-0 shadow-sm accent-green">
                <div class="d-flex align-items-center p-3">
                  <div class="icon-shape bg-mbr-green mr-3 text-white"><b-icon icon="cash-coin"></b-icon></div>
                  <div><div class="kpi-label">Total filtrado</div><h3 class="font-weight-bold mb-0 text-mbr-green">{{ formatMoney(instSearchedTotal) }}</h3></div>
                </div>
              </b-card>
            </b-col>
          </b-row>

          <!-- Tabela -->
          <b-card no-body class="border-0 shadow-sm overflow-hidden">
            <b-card-header class="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h6 class="mb-0 font-weight-bold text-muted">
                Registos: <b class="text-dark">{{ instSearchedList.length }}</b>
                <span v-if="instDateFrom || instDateTo" class="text-muted font-weight-normal ml-1">(filtrado de {{ myUpcomingInstallments.length }})</span>
              </h6>
            </b-card-header>

            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="bg-light text-mbr-green small text-uppercase font-weight-bold">
                  <tr>
                    <th class="border-0 pl-4">Mutuário</th>
                    <th class="border-0 text-right">Prestação</th>
                    <th class="border-0 text-right">Saldo Devedor</th>
                    <th class="border-0 text-center">Ordem</th>
                    <th class="border-0 text-center">Vencimento</th>
                    <th class="border-0 text-center">Estado</th>
                    <th class="border-0 text-center">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in instPaginatedList" :key="item.id">
                    <td class="pl-4 align-middle">
                      <div class="d-flex align-items-center" style="cursor:pointer" @click="openBorrowerFromInstallment(item)">
                        <div class="avatar-circle-sm mr-2">{{ getCustomerName(item.accountNumber).charAt(0) }}</div>
                        <div>
                          <span class="font-weight-bold text-dark">{{ getCustomerName(item.accountNumber) }}</span>
                          <br><small class="text-muted">{{ item.accountNumber }}</small>
                        </div>
                      </div>
                    </td>
                    <td class="align-middle text-right font-weight-bold text-mbr-green">{{ formatMoney(item.installment) }}</td>
                    <td class="align-middle text-right">
                      <span v-if="item.status === -1 && item.debtAmount" class="font-weight-bold text-danger">{{ formatMoney(item.debtAmount) }}</span>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td class="align-middle text-center">{{ item.installmentOrder }}</td>
                    <td class="align-middle text-center"><small>{{ formatDate(item.dueDate) }}</small></td>
                    <td class="align-middle text-center">
                      <b-badge v-if="item.status === 0" variant="soft-warning" pill class="px-3 py-1">Pendente</b-badge>
                      <b-badge v-else-if="item.status === -1" variant="soft-danger" pill class="px-3 py-1">Dívida parcial</b-badge>
                    </td>
                    <td class="align-middle text-center">
                      <b-button variant="mbr-green-light" size="sm" pill @click="openInstNotifModal(item)">
                        <b-icon icon="chat-left-dots-fill" class="mr-1"></b-icon> Notificar
                      </b-button>
                    </td>
                  </tr>
                  <tr v-if="instSearchedList.length === 0">
                    <td colspan="7" class="text-center py-5">
                      <b-icon icon="inbox" font-scale="3" class="text-muted mb-2 d-block mx-auto"></b-icon>
                      <p class="text-muted mb-0">Nenhuma prestação encontrada.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="instTotalPages > 1" class="d-flex justify-content-between align-items-center px-4 py-3 border-top">
              <small class="text-muted">{{ instStartIdx + 1 }}–{{ instEndIdx }} de {{ instSearchedList.length }}</small>
              <b-pagination v-model="instCurrentPage" :total-rows="instSearchedList.length" :per-page="instPerPage" size="sm" class="mb-0" first-number last-number limit="5"></b-pagination>
              <b-form-select v-model="instPerPage" :options="[10, 20, 50, 100]" size="sm" style="width: 80px" @change="instCurrentPage = 1"></b-form-select>
            </div>
          </b-card>
        </div>

        <!-- ═══════════════ SECÇÃO: NOTIFICAÇÕES ═══════════════ -->
        <div v-if="activeSection === 'notificacoes'">
          <b-row class="mb-4 align-items-center">
            <b-col md="6">
              <h4 class="text-dark font-weight-bold mb-1">
                <b-icon icon="bell-fill" class="text-mbr-green mr-2"></b-icon>
                Notificações
              </h4>
              <p class="text-muted small mb-0">{{ gestorNotifUnread }} não lida(s) de {{ gestorAllNotifs.length }} total</p>
            </b-col>
            <b-col md="6" class="text-md-right mt-3 mt-md-0">
              <b-form-radio-group v-model="gestorNotifFilter" buttons button-variant="outline-mbr" size="sm" class="mbr-radio-group mr-2">
                <b-form-radio value="all">Todas</b-form-radio>
                <b-form-radio value="unread">Não lidas</b-form-radio>
                <b-form-radio value="read">Lidas</b-form-radio>
              </b-form-radio-group>
              <b-button variant="outline-mbr-green" size="sm" class="mr-2" @click="markAllGestorNotifsRead()" :disabled="gestorNotifUnread === 0">
                <b-icon icon="check2-all" class="mr-1"></b-icon> Marcar todas
              </b-button>
              <b-button variant="mbr-green" size="sm" @click="fetchGestorNotifs()">
                <b-icon icon="arrow-repeat" class="mr-1"></b-icon> Actualizar
              </b-button>
            </b-col>
          </b-row>

          <b-overlay :show="gestorNotifLoading" rounded="sm" opacity="0.6">
            <div v-if="gestorFilteredNotifs.length === 0 && !gestorNotifLoading" class="text-center py-5">
              <b-icon icon="bell-slash" font-scale="3" class="text-muted mb-3 d-block mx-auto"></b-icon>
              <h6 class="text-muted">Sem notificações{{ gestorNotifFilter !== 'all' ? ' para este filtro' : '' }}.</h6>
            </div>

            <b-card
              v-for="gn in gestorPaginatedNotifs"
              :key="gn.id"
              no-body
              class="border-0 shadow-sm mb-2"
              :class="{ 'gestor-notif-unread': !gn.isRead }"
              style="border-left: 3px solid transparent !important; transition: all 0.2s;"
            >
              <b-card-body class="py-3 px-4">
                <div class="d-flex align-items-start">
                  <div class="notif-icon-circle-sm mr-3 mt-1" :class="'notif-type-' + gn.type">
                    <b-icon :icon="getNotifIcon(gn.type)" font-scale="0.85"></b-icon>
                  </div>
                  <div class="flex-grow-1" style="min-width: 0">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 class="font-weight-bold text-dark mb-1" style="font-size: 0.9rem">
                          {{ gn.title }}
                          <span v-if="!gn.isRead" class="unread-dot-green ml-1"></span>
                        </h6>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">{{ gn.message }}</p>
                        <small class="text-muted"><b-icon icon="clock" class="mr-1"></b-icon>{{ notifTimeAgo(gn.createdAt) }}</small>
                      </div>
                      <div class="d-flex flex-shrink-0 ml-3">
                        <b-button v-if="!gn.isRead" variant="link" size="sm" class="text-success p-1" @click.stop="markGestorNotifRead(gn)" v-b-tooltip.hover title="Marcar como lida">
                          <b-icon icon="check2"></b-icon>
                        </b-button>
                        <b-button variant="link" size="sm" class="text-danger p-1" @click.stop="deleteGestorNotif(gn)" v-b-tooltip.hover title="Eliminar">
                          <b-icon icon="trash"></b-icon>
                        </b-button>
                      </div>
                    </div>
                  </div>
                </div>
              </b-card-body>
            </b-card>

            <div v-if="gestorNotifTotalPages > 1" class="d-flex justify-content-between align-items-center mt-3">
              <small class="text-muted">{{ gestorNotifStartIdx + 1 }}–{{ gestorNotifEndIdx }} de {{ gestorFilteredNotifs.length }}</small>
              <b-pagination v-model="gestorNotifPage" :total-rows="gestorFilteredNotifs.length" :per-page="gestorNotifPerPage" size="sm" class="mb-0" first-number last-number limit="5"></b-pagination>
              <b-form-select v-model="gestorNotifPerPage" :options="[15, 30, 50]" size="sm" style="width: 80px" @change="gestorNotifPage = 1"></b-form-select>
            </div>
          </b-overlay>
        </div>

        <!-- ═══════════════ SECÇÃO: PAGAMENTOS ═══════════════ -->
        <div v-if="activeSection === 'pagamentos'">
          <b-row class="mb-4 align-items-center">
            <b-col md="6">
              <h4 class="text-dark font-weight-bold mb-1">
                <b-icon icon="wallet2" class="text-mbr-green mr-2"></b-icon>
                Pagamentos
              </h4>
              <p class="text-muted small mb-0">Pagamentos dos créditos instruídos por si</p>
            </b-col>
            <b-col md="6" class="text-md-right mt-3 mt-md-0">
              <b-button variant="mbr-green" size="sm" @click="fetchGestorPayments(1)" :disabled="gestorPayLoading">
                <b-icon icon="arrow-repeat" class="mr-1" :animation="gestorPayLoading ? 'spin' : ''"></b-icon> Actualizar
              </b-button>
            </b-col>
          </b-row>

          <!-- Filtros -->
          <b-card class="border-0 shadow-sm mb-3" no-body>
            <b-card-body class="py-2 px-3">
              <b-row align-v="end">
                <b-col lg="2" md="4" sm="6" class="mb-2 mb-lg-0">
                  <b-form-group label="Data Início" label-size="sm" class="mb-0">
                    <b-form-datepicker v-model="gestorPayFromDate" placeholder="Data início" block size="sm" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
                  </b-form-group>
                </b-col>
                <b-col lg="2" md="4" sm="6" class="mb-2 mb-lg-0">
                  <b-form-group label="Data Fim" label-size="sm" class="mb-0">
                    <b-form-datepicker v-model="gestorPayToDate" placeholder="Data fim" block size="sm" :min="gestorPayFromDate" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
                  </b-form-group>
                </b-col>
                <b-col lg="2" md="4" sm="6" class="mb-2 mb-lg-0">
                  <b-form-group label="Meio de Pagamento" label-size="sm" class="mb-0">
                    <b-form-select v-model="gestorPayMethod" :options="gestorPayMethodOptions" size="sm"></b-form-select>
                  </b-form-group>
                </b-col>
                <b-col lg="2" md="4" sm="6" class="mb-2 mb-lg-0">
                  <b-form-group label="Pesquisar" label-size="sm" class="mb-0">
                    <b-form-input v-model="gestorPaySearch" size="sm" placeholder="Nº conta, referência..." @keyup.enter="fetchGestorPayments(1)"></b-form-input>
                  </b-form-group>
                </b-col>
                <b-col cols="auto" class="mb-2 mb-lg-0">
                  <b-button size="sm" variant="success" @click="fetchGestorPayments(1)" :disabled="gestorPayLoading">
                    <b-icon icon="search" class="mr-1"></b-icon> Buscar
                  </b-button>
                  <b-button size="sm" variant="outline-secondary" class="ml-1" @click="clearGestorPayFilters()">
                    <b-icon icon="x-circle" class="mr-1"></b-icon> Limpar
                  </b-button>
                </b-col>
              </b-row>
            </b-card-body>
          </b-card>

          <!-- KPIs -->
          <b-card class="border-0 shadow-sm mb-3" no-body v-if="gestorPayments.length > 0">
            <b-card-body class="py-2 px-3">
              <div class="d-flex gap-4 flex-wrap">
                <div class="mr-4">
                  <small class="text-muted text-uppercase d-block" style="font-size: 0.65rem; font-weight: 600;">Total Pago</small>
                  <strong class="text-success">{{ formatMoney(gestorPayTotals.totalAmount) }}</strong>
                </div>
                <div class="mr-4">
                  <small class="text-muted text-uppercase d-block" style="font-size: 0.65rem; font-weight: 600;">Juros de Mora</small>
                  <strong class="text-warning">{{ formatMoney(gestorPayTotals.totalLateInterest) }}</strong>
                </div>
                <div>
                  <small class="text-muted text-uppercase d-block" style="font-size: 0.65rem; font-weight: 600;">Registos</small>
                  <strong>{{ gestorPayPagination.totalItems }}</strong>
                </div>
              </div>
            </b-card-body>
          </b-card>

          <!-- Tabela -->
          <b-card class="border-0 shadow-sm mb-3" no-body>
            <b-card-header class="bg-dark text-white py-2 px-3" style="font-size: 0.85rem;">
              <b-icon icon="table" class="mr-2"></b-icon> Lista de Pagamentos
              <b-badge variant="light" pill class="ml-2 text-dark" v-if="gestorPayments.length > 0">{{ gestorPayPagination.totalItems }}</b-badge>
            </b-card-header>
            <b-overlay :show="gestorPayLoading" rounded="sm" opacity="0.6">
              <div class="table-responsive" v-if="gestorPayments.length > 0">
                <table class="table table-sm table-hover table-bordered mb-0" style="font-size: 0.75rem">
                  <thead>
                    <tr class="bg-dark text-white">
                      <th class="text-center" style="width: 40px">#</th>
                      <th>Cliente</th>
                      <th class="text-center">Nº Conta</th>
                      <th class="text-right">Valor (MZN)</th>
                      <th class="text-center">Método</th>
                      <th class="text-center">Referência</th>
                      <th class="text-center">Data</th>
                      <th class="text-center">Acções</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(pay, idx) in gestorPayments" :key="pay.id">
                      <td class="text-center">{{ (gestorPayPagination.currentPage - 1) * gestorPayPerPage + idx + 1 }}</td>
                      <td>{{ getCustomerName(pay.accountNumber) }}</td>
                      <td class="text-center">{{ pay.accountNumber }}</td>
                      <td class="text-right font-weight-bold text-success">{{ formatMoney(pay.amount) }}</td>
                      <td class="text-center">
                        <b-badge :variant="gestorPayMethodVariant(pay.paymentMethod)" pill>{{ gestorPayMethodLabel(pay.paymentMethod) }}</b-badge>
                      </td>
                      <td class="text-center">{{ pay.tranzactionReference }}</td>
                      <td class="text-center" v-date-format="pay.paymentDate || pay.createdAt"></td>
                      <td class="text-center">
                        <a
                          v-if="pay.receiptUrl"
                          :href="buildDocumentLink(pay.receiptUrl)"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <b-badge variant="primary" pill class="px-2 py-1">
                            <b-icon icon="eye-fill" class="mr-1"></b-icon>
                            Ver comprovativo
                          </b-badge>
                        </a>
                        <b-badge v-else variant="secondary" pill class="px-2 py-1">
                          Sem comprovativo
                        </b-badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="gestorPayments.length === 0 && !gestorPayLoading" class="text-center py-5">
                <b-icon icon="wallet" font-scale="3" class="text-muted mb-3 d-block mx-auto"></b-icon>
                <h6 class="text-muted">Sem pagamentos encontrados.</h6>
              </div>
            </b-overlay>

            <!-- Paginação -->
            <div v-if="gestorPayPagination.totalPages > 1" class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
              <small class="text-muted">
                {{ (gestorPayPagination.currentPage - 1) * gestorPayPerPage + 1 }}–{{ Math.min(gestorPayPagination.currentPage * gestorPayPerPage, gestorPayPagination.totalItems) }}
                de {{ gestorPayPagination.totalItems }}
              </small>
              <div class="d-flex align-items-center">
                <b-form-select v-model="gestorPayPerPage" :options="gestorPayPerPageOptions" size="sm" style="width: 85px" class="mr-2" @change="fetchGestorPayments(1)"></b-form-select>
                <b-button-group size="sm">
                  <b-button variant="outline-secondary" :disabled="gestorPayPagination.currentPage <= 1" @click="fetchGestorPayments(1)">
                    <b-icon icon="chevron-bar-left"></b-icon>
                  </b-button>
                  <b-button variant="outline-secondary" :disabled="gestorPayPagination.currentPage <= 1" @click="fetchGestorPayments(gestorPayPagination.currentPage - 1)">
                    <b-icon icon="chevron-left"></b-icon>
                  </b-button>
                </b-button-group>
                <span class="mx-2 font-weight-bold" style="font-size: 0.82rem">{{ gestorPayPagination.currentPage }} / {{ gestorPayPagination.totalPages }}</span>
                <b-button-group size="sm">
                  <b-button variant="outline-secondary" :disabled="gestorPayPagination.currentPage >= gestorPayPagination.totalPages" @click="fetchGestorPayments(gestorPayPagination.currentPage + 1)">
                    <b-icon icon="chevron-right"></b-icon>
                  </b-button>
                  <b-button variant="outline-secondary" :disabled="gestorPayPagination.currentPage >= gestorPayPagination.totalPages" @click="fetchGestorPayments(gestorPayPagination.totalPages)">
                    <b-icon icon="chevron-bar-right"></b-icon>
                  </b-button>
                </b-button-group>
              </div>
            </div>
          </b-card>
        </div>

      </b-overlay>
    </b-container>

    <!-- Modal: Notificação de prestação (Gestor) -->
    <b-modal ref="inst-notification-modal" title="Enviar Notificação" centered size="lg" hide-footer>
      <b-overlay :show="instSendingNotif" rounded="sm">
        <div class="p-3 bg-light rounded mb-3">
          <b-row>
            <b-col sm="6"><small class="text-muted d-block">Mutuário</small><strong>{{ instNotifData.customerName }}</strong></b-col>
            <b-col sm="3"><small class="text-muted d-block">Prestação nº</small><strong>{{ instNotifData.installmentOrder }}</strong></b-col>
            <b-col sm="3"><small class="text-muted d-block">Valor</small><strong class="text-mbr-green">{{ formatMoney(instNotifData.installmentAmount) }}</strong></b-col>
          </b-row>
        </div>
        <h6 class="font-weight-bold text-dark mb-2"><b-icon icon="broadcast" class="mr-1"></b-icon> Canal de envio</h6>
        <b-form-checkbox-group v-model="instNotifChannels" class="mb-3">
          <b-form-checkbox value="sms" class="mr-3"><b-icon icon="chat-left-dots" class="mr-1 text-info"></b-icon> SMS</b-form-checkbox>
          <b-form-checkbox value="email" class="mr-3"><b-icon icon="envelope" class="mr-1 text-warning"></b-icon> E-mail</b-form-checkbox>
          <b-form-checkbox value="whatsapp"><b-icon icon="whatsapp" class="mr-1 text-success"></b-icon> WhatsApp</b-form-checkbox>
        </b-form-checkbox-group>
        <b-row class="mb-3" v-if="instNotifChannels.length > 0">
          <b-col sm="6" v-if="instNotifChannels.includes('sms') || instNotifChannels.includes('whatsapp')">
            <b-form-group label="Telefone" label-size="sm" label-class="font-weight-bold">
              <b-form-input v-model="instNotifData.phone" size="sm" placeholder="Ex: 258841234567"></b-form-input>
            </b-form-group>
          </b-col>
          <b-col sm="6" v-if="instNotifChannels.includes('email')">
            <b-form-group label="E-mail" label-size="sm" label-class="font-weight-bold">
              <b-form-input v-model="instNotifData.email" size="sm" type="email" placeholder="cliente@email.com"></b-form-input>
            </b-form-group>
          </b-col>
        </b-row>
        <b-form-group label="Mensagem" label-size="sm" label-class="font-weight-bold" class="mb-3">
          <b-form-textarea v-model="instNotifMessage" rows="5" max-rows="10" size="sm"></b-form-textarea>
          <small class="text-muted">{{ instNotifMessage.length }} caracteres</small>
        </b-form-group>
        <hr class="my-2" />
        <div class="d-flex justify-content-between align-items-center">
          <b-button size="sm" variant="outline-secondary" @click="$refs['inst-notification-modal'].hide()">Cancelar</b-button>
          <div>
            <b-button size="sm" variant="outline-mbr-green" class="mr-2" @click="resetInstNotifMessage()">
              <b-icon icon="arrow-counterclockwise" class="mr-1"></b-icon> Repor
            </b-button>
            <b-button size="sm" variant="mbr-green" :disabled="instNotifChannels.length === 0 || instNotifMessage.length === 0 || instSendingNotif" @click="sendInstNotification()" class="px-4">
              <b-icon icon="send" class="mr-1"></b-icon> Enviar ({{ instNotifChannels.length }})
            </b-button>
          </div>
        </div>
      </b-overlay>
    </b-modal>

    <!-- Modal: Confirmar desabilitação -->
    <b-modal hide-footer centered ref="modal-toggle-status" title="Confirmar Acção" header-bg-variant="warning" header-text-variant="dark">
      <div class="text-center py-3">
        <b-icon icon="exclamation-triangle-fill" variant="warning" font-scale="2.5" class="mb-3"></b-icon>
        <p class="mb-0" v-if="toggleTarget">
          Deseja {{ toggleTarget.customerStatus == 0 ? 'desabilitar' : 'habilitar' }} o mutuário <strong>{{ toggleTarget.customerName }}</strong>?
        </p>
      </div>
      <hr />
      <div class="d-flex justify-content-end">
        <b-button size="sm" variant="outline-secondary" class="mr-2" @click="$refs['modal-toggle-status'].hide()">Cancelar</b-button>
        <b-button size="sm" :variant="toggleTarget && toggleTarget.customerStatus == 0 ? 'danger' : 'success'" @click="confirmToggleStatus()">
          {{ toggleTarget && toggleTarget.customerStatus == 0 ? 'Desabilitar' : 'Habilitar' }}
        </b-button>
      </div>
    </b-modal>

    <!-- Modal: Confirmar eliminação de documento -->
    <b-modal hide-footer ref="modal-delete-doc" title="Confirmar Eliminação" centered>
      <div class="text-center py-3">
        <b-icon icon="exclamation-triangle-fill" variant="danger" font-scale="2.5" class="mb-3"></b-icon>
        <p class="text-danger mb-0">Deseja realmente eliminar este documento?</p>
        <small class="text-muted">Esta acção não pode ser revertida.</small>
      </div>
      <hr />
      <div class="d-flex justify-content-end">
        <b-button size="sm" variant="outline-secondary" class="mr-2" @click="$refs['modal-delete-doc'].hide()">Cancelar</b-button>
        <b-button size="sm" variant="danger" @click="confirmDeleteDoc()">
          <b-icon icon="trash-fill" class="mr-1"></b-icon> Eliminar
        </b-button>
      </div>
    </b-modal>
  </div>
</template>

<script>
import axios from "axios";
import { mapGetters } from "vuex";
import LoansItems from "@/components/loans/LoansItems";
import MoneyFormat from "../utils/moneyFormat";
import logs from "@/utils/logs";
import loanSimulator from "@/utils/loanAmortization";
import moment from "moment";

export default {
  name: "GestorDashboardView",

  components: { LoansItems },

  data: () => ({
    activeSection: "dashboard",
    dashboardDateFrom: "",
    dashboardDateTo: "",
    searchValues: "",
    searchTimeout: null,
    perPage: 15,
    perPageOptions: [
      { value: 10, text: "10" },
      { value: 15, text: "15" },
      { value: 25, text: "25" },
      { value: 50, text: "50" },
      { value: 100, text: "100" },
    ],

    // Formulário de mutuário
    customerForm: {
      customerName: "",
      sex: null,
      customerEmail: "",
      customerPhone: "",
      customerNuit: "",
      customerNationalId: "",
      issuedAt: "",
      localOfIssue: "",
      customerDateOfBirth: "",
      customerMonthlySalary: 0,
      customerAddress: "",
      customerProfession: "",
      customerLocalOfWork: "",
      maritalStatus: null,
      customerSpouseName: "",
      customerSpouseContact: "",
      customerEmergencyPerson: "",
      customerEmergencyContact: "",
      customerStatus: 0,
      interestRateId: 0,
    },
    customerUpdationId: 0,

    genderOptions: [
      { text: "Género", value: null },
      { text: "Masculino", value: "M" },
      { text: "Feminino", value: "F" },
    ],
    maritalStatusOptions: [
      { text: "Selecione o Estado Civil", value: null },
      { text: "Solteiro(a)", value: "solteiro" },
      { text: "Casado(a)", value: "casado" },
      { text: "Divorciado(a)", value: "divorciado" },
      { text: "Viúvo(a)", value: "viúvo" },
    ],

    // Borrower (painel do mutuário)
    selectedCustomer: null,
    docForm: { accountNumber: "", documentFileUrl: "", documentName: null, uploadedBy: "" },
    documentTypeOptions: [
      { text: "Selecionar tipo de documento", value: null },
      { text: "BI / Passaporte / Carta de condução", value: "BI / Passaporte / Carta de condução" },
      { text: "NUIT", value: "NUIT" },
      { text: "Alvará", value: "Alvará" },
      { text: "Declaração do bairro", value: "Declaração do bairro" },
      { text: "Contrato autenticado", value: "Contrato autenticado" },
      { text: "Comprovativo de rendimentos", value: "Comprovativo de rendimentos" },
    ],
    selectedFile: "",
    uploadValue: 0,
    borrowerDocuments: [],
    borrowerAmortization: [],
    borrowerTotal2Pay: 0,
    borrowerElegibility: false,
    documentDeletionId: 0,
    toggleTarget: null,

    // Simulação de crédito
    loanForm: {
      capital: 0,
      juros: null,
      prestacoes: null,
      loanDescription: "Crédito desembolsado mediante apresentação de garantias",
      dateCreated: moment().format("YYYY-MM-DD"),
    },

    typeOfCredit: [{ text: "Taxa de juros", value: null }],
    numeroPrestacoes: [
      { text: "Nº Prestações", value: null },
      ...Array.from({ length: 18 }, (_, i) => ({
        text: `${i + 1} ${i + 1 === 1 ? "prestação" : "prestações"}`,
        value: i + 1,
      })),
    ],

    // Prestações do gestor
    instDateFrom: "",
    instDateTo: "",
    instRangeFilter: "30",
    instCurrentPage: 1,
    instPerPage: 20,
    instNotifData: { customerName: "", phone: "", email: "", accountNumber: "", installmentOrder: 0, installmentAmount: 0 },
    instNotifMessage: "",
    instNotifChannels: ["sms"],
    instSendingNotif: false,
    instCurrentItem: null,

    // Página de notificações do gestor
    gestorAllNotifs: [],
    gestorNotifLoading: false,
    gestorNotifFilter: "all",
    gestorNotifPage: 1,
    gestorNotifPerPage: 15,

    // Pagamentos do gestor
    gestorPayments: [],
    gestorPayLoading: false,
    gestorPayFromDate: "",
    gestorPayToDate: "",
    gestorPayMethod: 0,
    gestorPaySearch: "",
    gestorPayPerPage: 15,
    gestorPayPerPageOptions: [
      { value: 10, text: "10 / pág" },
      { value: 15, text: "15 / pág" },
      { value: 25, text: "25 / pág" },
      { value: 100, text: "100 / pág" },
    ],
    gestorPayMethodOptions: [
      { value: 0, text: "Todos" },
      { value: 1, text: "Boca de Caixa" },
      { value: 2, text: "Depósito Bancário" },
      { value: 3, text: "Transferência Bancária" },
      { value: 4, text: "POS" },
      { value: 5, text: "Cheque" },
      { value: 6, text: "SISTAFE" },
      { value: 7, text: "M-Pesa" },
      { value: 8, text: "E-Mola" },
    ],
    gestorPayPagination: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      itemsPerPage: 15,
      hasNextPage: false,
      hasPrevPage: false,
    },
    gestorPayTotals: {
      totalAmount: 0,
      totalLateInterest: 0,
      totalInterestRate: 0,
    },

    // Notificações (dropdown)
    notifList: [],
    notifUnreadCount: 0,
    notifPollingTimer: null,
  }),

  computed: {
    ...mapGetters([
      "isLoading",
      "user",
      "users",
      "token",
      "customers",
      "customersNameMap",
      "customersPagination",
      "company",
      "companyLoans",
      "interestRates",
      "currentCustomer",
      "customerLoans",
      "upcomingInstallments",
      "dashboardKpis",
    ]),

    todayFormatted() {
      return moment().format("DD/MM/YYYY");
    },
    borrowerLoansCount() {
      return (this.customerLoans || []).length;
    },
    borrowerActiveLoansCount() {
      return (this.customerLoans || []).filter((loan) => Number(loan.status) === 1).length;
    },
    borrowerEstimatedInstallment() {
      if (!this.borrowerAmortization || this.borrowerAmortization.length === 0) return 0;
      return Number(this.borrowerAmortization[0].installment || 0);
    },
    maxBorrowerInstallmentCapacity() {
      return (parseFloat(this.selectedCustomer?.customerMonthlySalary) || 0) / 3;
    },
    borrowerInstallmentDelta() {
      if (!this.borrowerEstimatedInstallment) return this.maxBorrowerInstallmentCapacity;
      return this.maxBorrowerInstallmentCapacity - this.borrowerEstimatedInstallment;
    },
    borrowerInstallmentDeltaClass() {
      return this.borrowerInstallmentDelta >= 0 ? "text-success" : "text-danger";
    },
    borrowerStatusVariant() {
      return Number(this.selectedCustomer?.customerStatus) === 0 ? "success" : "danger";
    },
    borrowerStatusLabel() {
      return Number(this.selectedCustomer?.customerStatus) === 0 ? "Mutuário activo" : "Mutuário desabilitado";
    },

    paginationStart() {
      if (this.customersPagination.totalItems === 0) return 0;
      return (this.customersPagination.currentPage - 1) * this.customersPagination.itemsPerPage + 1;
    },

    paginationEnd() {
      const end = this.customersPagination.currentPage * this.customersPagination.itemsPerPage;
      return Math.min(end, this.customersPagination.totalItems);
    },

    visiblePages() {
      const total = this.customersPagination.totalPages;
      const current = this.customersPagination.currentPage;
      const maxVisible = 5;
      const pages = [];
      if (total <= maxVisible) {
        for (let i = 1; i <= total; i++) pages.push(i);
      } else {
        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = start + maxVisible - 1;
        if (end > total) {
          end = total;
          start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) pages.push(i);
      }
      return pages;
    },

    myLoans() {
      return (this.companyLoans || []).filter(
        (l) => Number(l.creditManager) === Number(this.user.id)
      );
    },
    myLoansDisplay() {
      let list = this.myLoans;
      if (this.dashboardDateFrom) {
        const from = moment(this.dashboardDateFrom).startOf("day");
        list = list.filter((l) => moment(l.dateCreated || l.createdAt).isSameOrAfter(from));
      }
      if (this.dashboardDateTo) {
        const to = moment(this.dashboardDateTo).endOf("day");
        list = list.filter((l) => moment(l.dateCreated || l.createdAt).isSameOrBefore(to));
      }
      return list;
    },

    myActiveLoans() {
      return this.myLoans.filter((l) => Number(l.status) === 1);
    },

    myPendingLoans() {
      return this.myLoans.filter((l) => Number(l.status) === 0);
    },

    myDisbursed() {
      return this.myActiveLoans.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    },

    dashboardLoans() {
      return this.dashboardKpis?.loans || {};
    },
    dashboardFinancial() {
      return this.dashboardKpis?.financial || {};
    },
    dashboardDelinquency() {
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
    overdueRateClass() {
      const rate = Number(this.dashboardDelinquency.overdueRate || 0);
      if (rate >= 25) return "text-danger";
      if (rate >= 10) return "text-warning";
      return "text-success";
    },
    myDisbursedDisplay() {
      const v = Number(this.dashboardFinancial.totalDisbursed);
      return Number.isFinite(v) ? v : this.myDisbursed;
    },
    myPendingCountDisplay() {
      const v = Number(this.dashboardLoans.pending);
      return Number.isFinite(v) ? v : this.myPendingLoans.length;
    },
    myActiveCountDisplay() {
      const v = Number(this.dashboardLoans.active);
      return Number.isFinite(v) ? v : this.myActiveLoans.length;
    },

    myLoanIds() {
      return this.myLoans.map((l) => l.id);
    },
    myUpcomingInstallments() {
      return (this.upcomingInstallments || []).filter((i) => this.myLoanIds.includes(i.loanId));
    },
    myDueToday() {
      const s = moment().startOf("day"), e = moment().endOf("day");
      return this.myUpcomingInstallments.filter((i) => moment(i.dueDate).isBetween(s, e, undefined, "[]"));
    },
    myUpcoming7() {
      const s = moment().startOf("day"), e = moment().add(7, "days").endOf("day");
      return this.myUpcomingInstallments.filter((i) => moment(i.dueDate).isBetween(s, e, undefined, "[]"));
    },
    myUpcoming30() {
      const s = moment().startOf("day"), e = moment().add(30, "days").endOf("day");
      return this.myUpcomingInstallments.filter((i) => moment(i.dueDate).isBetween(s, e, undefined, "[]"));
    },
    instBaseList() {
      if (this.instRangeFilter === "today") return this.myDueToday;
      if (this.instRangeFilter === "7") return this.myUpcoming7;
      if (this.instRangeFilter === "all") return this.myUpcomingInstallments;
      return this.myUpcoming30;
    },
    instSearchedList() {
      let r = (this.instDateFrom || this.instDateTo) ? this.myUpcomingInstallments : this.instBaseList;
      if (this.instDateFrom) {
        const f = moment(this.instDateFrom).startOf("day");
        r = r.filter((i) => moment(i.dueDate).isSameOrAfter(f));
      }
      if (this.instDateTo) {
        const t = moment(this.instDateTo).endOf("day");
        r = r.filter((i) => moment(i.dueDate).isSameOrBefore(t));
      }
      return r;
    },
    instSearchedTotal() {
      return this.instSearchedList.reduce((s, i) => s + (i.installment || 0), 0);
    },
    instTotalPages() { return Math.ceil(this.instSearchedList.length / this.instPerPage); },
    instStartIdx() { return (this.instCurrentPage - 1) * this.instPerPage; },
    instEndIdx() { return Math.min(this.instStartIdx + this.instPerPage, this.instSearchedList.length); },
    instPaginatedList() { return this.instSearchedList.slice(this.instStartIdx, this.instEndIdx); },

    gestorNotifUnread() { return this.gestorAllNotifs.filter((n) => !n.isRead).length; },
    gestorFilteredNotifs() {
      if (this.gestorNotifFilter === "unread") return this.gestorAllNotifs.filter((n) => !n.isRead);
      if (this.gestorNotifFilter === "read") return this.gestorAllNotifs.filter((n) => n.isRead);
      return this.gestorAllNotifs;
    },
    gestorNotifTotalPages() { return Math.ceil(this.gestorFilteredNotifs.length / this.gestorNotifPerPage); },
    gestorNotifStartIdx() { return (this.gestorNotifPage - 1) * this.gestorNotifPerPage; },
    gestorNotifEndIdx() { return Math.min(this.gestorNotifStartIdx + this.gestorNotifPerPage, this.gestorFilteredNotifs.length); },
    gestorPaginatedNotifs() { return this.gestorFilteredNotifs.slice(this.gestorNotifStartIdx, this.gestorNotifEndIdx); },

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
  },

  beforeDestroy() {
    if (this.notifPollingTimer) {
      clearInterval(this.notifPollingTimer);
    }
  },

  created() {
    if (this.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
    }
    this.loadInitialData();
    if (this.company && this.company.id) {
      this.$store.dispatch("getUpcomingInstallments", this.company.id);
    }
    // Iniciar polling de notificações
    this.fetchNotifUnreadCount();
    this.notifPollingTimer = setInterval(() => {
      this.fetchNotifUnreadCount();
    }, 30000);
  },

  methods: {
    // ── Notificações ──
    async fetchNotifUnreadCount() {
      if (!this.company || !this.company.id) return;
      try {
        const res = await axios.get(
          `/api/notifications/unread/${this.company.id}?recipientType=gestor&recipientId=${this.user.id}`
        );
        if (res.data.success) this.notifUnreadCount = res.data.result;
      } catch (err) { /* silenciar */ }
    },

    async onNotificationDropdownShow() {
      if (!this.company || !this.company.id) return;
      try {
        const res = await axios.get(
          `/api/notifications/${this.company.id}?recipientType=gestor&recipientId=${this.user.id}`
        );
        if (res.data.success) this.notifList = res.data.result;
      } catch (err) { console.error("Erro notificações:", err); }
    },

    async onNotifClick(notif) {
      if (!notif.isRead) {
        try {
          await axios.put(`/api/notifications/read/${notif.id}`);
          notif.isRead = true;
          this.notifUnreadCount = Math.max(0, this.notifUnreadCount - 1);
        } catch (err) { /* silenciar */ }
      }
    },

    async markAllNotifRead() {
      if (!this.company || !this.company.id) return;
      try {
        await axios.put(`/api/notifications/markAllRead/${this.company.id}`, {
          recipientType: "gestor",
          recipientId: this.user.id,
        });
        this.notifList.forEach((n) => (n.isRead = true));
        this.notifUnreadCount = 0;
      } catch (err) { console.error("Erro marcar lidas:", err); }
    },

    buildDocumentLink(documentFileUrl) {
      if (!documentFileUrl) return "#";

      const normalizedUrl = String(documentFileUrl).trim();
      if (/^https?:\/\//i.test(normalizedUrl)) return normalizedUrl;

      const fileName = normalizedUrl.split("/").filter(Boolean).pop();
      if (!fileName) return "#";

      return `/api/document/file/${encodeURIComponent(fileName)}`;
    },

    getNotifIcon(type) {
      const icons = {
        loan_request: "credit-card-2-front",
        loan_approved: "check-circle-fill",
        loan_rejected: "x-circle-fill",
        loan_disbursed: "cash-stack",
        payment_received: "wallet2",
        installment_due: "clock",
        installment_overdue: "exclamation-triangle-fill",
        general: "info-circle-fill",
      };
      return icons[type] || "bell";
    },

    notifTimeAgo(date) {
      if (!date) return "";
      const m = moment(date);
      if (!m.isValid()) return "--";
      const diffMin = moment().diff(m, "minutes");
      if (diffMin < 1) return "Agora mesmo";
      if (diffMin < 60) return `Há ${diffMin} min`;
      const diffH = moment().diff(m, "hours");
      if (diffH < 24) return `Há ${diffH}h`;
      const diffD = moment().diff(m, "days");
      if (diffD < 7) return `Há ${diffD}d`;
      return m.format("DD/MM/YYYY");
    },

    // ── Dados iniciais ──
    async loadInitialData() {
      if (!this.company || !this.company.id) {
        try {
          await this.$store.dispatch("getCompanyDetails", this.user.companyId);
        } catch (err) {
          console.error("Erro ao carregar empresa:", err);
          return;
        }
      }
      const companyId = this.company.id;
      this.$store.dispatch("getAllCustomers", companyId);
      this.$store.dispatch("getAllRates", companyId);
      this.$store.dispatch("getCompanyLoans", companyId);
      this.$store.dispatch("getAllUsers", companyId);
      this.loadDashboardOverview();

      // Popular taxas de juros
      if (this.typeOfCredit.length <= 1) {
        this.interestRates.forEach((rate) => {
          this.typeOfCredit.push({
            text: `${rate.tax * 100}% - ${rate.name}`,
            value: rate.tax,
          });
        });
      }
    },

    refreshData() {
      if (this.company && this.company.id) {
        this.$store.dispatch("getCompanyLoans", this.company.id);
        this.fetchCustomers(this.customersPagination.currentPage || 1);
        this.loadDashboardOverview();
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

    loadDashboardOverview() {
      if (!this.company || !this.company.id || !this.user || !this.user.id) return;
      const payload = {
        companyId: this.company.id,
        creditManager: this.user.id,
      };
      if (this.dashboardDateFrom) payload.from = this.dashboardDateFrom;
      if (this.dashboardDateTo) payload.to = this.dashboardDateTo;
      this.$store.dispatch("getDashboardOverview", {
        ...payload,
      });
    },

    // ── Prestações do Gestor ──
    syncMyInstallments() {
      if (this.company && this.company.id) {
        this.$store.dispatch("getUpcomingInstallments", this.company.id);
      }
    },

    clearInstFilters() {
      this.instDateFrom = "";
      this.instDateTo = "";
      this.instCurrentPage = 1;
    },

    openBorrowerFromInstallment(item) {
      const customer = this.customers.find((c) => c.accountNumber === item.accountNumber);
      if (customer) {
        this.openBorrower(customer);
      }
    },

    buildInstNotifMessage(customer, item) {
      return `Prezado(a) ${customer.customerName},\n\nLembramos que a prestação nº ${item.installmentOrder} no valor de ${MoneyFormat.formatMoney(item.installment)} vence em breve. Caso já tenha efectuado o pagamento, por favor desconsidere esta mensagem.\n\n${this.company.companyName}`;
    },

    openInstNotifModal(item) {
      const customer = this.customers.find((c) => c.accountNumber === item.accountNumber);
      if (!customer) {
        this.$bvToast.toast("Cliente não encontrado.", { title: "Aviso!", variant: "warning", solid: true, toaster: "b-toaster-top-center" });
        return;
      }
      this.instCurrentItem = item;
      this.instNotifData = {
        customerName: customer.customerName,
        phone: customer.customerPhone || "",
        email: customer.customerEmail || "",
        accountNumber: customer.accountNumber,
        installmentOrder: item.installmentOrder,
        installmentAmount: item.installment,
      };
      this.instNotifMessage = this.buildInstNotifMessage(customer, item);
      this.instNotifChannels = ["sms"];
      this.$refs["inst-notification-modal"].show();
    },

    resetInstNotifMessage() {
      const customer = this.customers.find((c) => c.accountNumber === this.instNotifData.accountNumber);
      if (customer && this.instCurrentItem) {
        this.instNotifMessage = this.buildInstNotifMessage(customer, this.instCurrentItem);
      }
    },

    async sendInstNotification() {
      this.instSendingNotif = true;
      const results = [];
      try {
        if (this.instNotifChannels.includes("sms")) {
          if (!this.instNotifData.phone) { this.showInstToast("Aviso!", "warning", "Telefone obrigatório para SMS."); this.instSendingNotif = false; return; }
          this.$store.dispatch("sendSMSMessage", { receipient: this.instNotifData.phone, accountNumber: this.instNotifData.accountNumber, sender: this.company.smsSender, companyId: this.company.id, smsBody: this.instNotifMessage });
          results.push("SMS");
        }
        if (this.instNotifChannels.includes("whatsapp")) {
          if (!this.instNotifData.phone) { this.showInstToast("Aviso!", "warning", "Telefone obrigatório para WhatsApp."); this.instSendingNotif = false; return; }
          window.open(`https://wa.me/${this.instNotifData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(this.instNotifMessage)}`, "_blank");
          results.push("WhatsApp");
        }
        if (this.instNotifChannels.includes("email")) {
          if (!this.instNotifData.email) { this.showInstToast("Aviso!", "warning", "E-mail obrigatório."); this.instSendingNotif = false; return; }
          window.open(`mailto:${this.instNotifData.email}?subject=${encodeURIComponent("Lembrete de Prestação - " + this.company.companyName)}&body=${encodeURIComponent(this.instNotifMessage)}`, "_blank");
          results.push("E-mail");
        }
        if (results.length > 0) {
          this.showInstToast("Sucesso!", "success", `Notificação enviada via: ${results.join(", ")}`);
          this.$refs["inst-notification-modal"].hide();
        }
      } catch (e) {
        this.showInstToast("Erro!", "danger", "Erro ao enviar notificação.");
      } finally {
        this.instSendingNotif = false;
      }
    },

    showInstToast(title, variant, msg) {
      this.$bvToast.toast(msg, { title, variant, solid: true, toaster: "b-toaster-top-center", autoHideDelay: 5000 });
    },

    // ── Página de Notificações do Gestor ──
    async fetchGestorNotifs() {
      if (!this.company || !this.company.id) return;
      this.gestorNotifLoading = true;
      try {
        const res = await axios.get(`/api/notifications/${this.company.id}`, {
          params: { recipientType: "gestor", recipientId: this.user.id },
        });
        if (res.data.success) this.gestorAllNotifs = res.data.result;
      } catch (err) {
        console.error("Erro notificações gestor:", err);
      } finally {
        this.gestorNotifLoading = false;
      }
    },

    async markGestorNotifRead(notif) {
      try {
        await axios.put(`/api/notifications/read/${notif.id}`);
        notif.isRead = true;
        this.notifUnreadCount = Math.max(0, this.notifUnreadCount - 1);
      } catch (err) { console.error(err); }
    },

    async markAllGestorNotifsRead() {
      if (!this.company || !this.company.id) return;
      try {
        await axios.put(`/api/notifications/markAllRead/${this.company.id}`, {
          recipientType: "gestor",
          recipientId: this.user.id,
        });
        this.gestorAllNotifs.forEach((n) => (n.isRead = true));
        this.notifUnreadCount = 0;
      } catch (err) { console.error(err); }
    },

    async deleteGestorNotif(notif) {
      try {
        await axios.delete(`/api/notifications/${notif.id}`);
        this.gestorAllNotifs = this.gestorAllNotifs.filter((n) => n.id !== notif.id);
      } catch (err) { console.error(err); }
    },

    // ── Pagamentos do Gestor ──
    fetchGestorPayments(page) {
      if (!this.company || !this.company.id || !this.user) return;
      this.gestorPayLoading = true;

      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", this.gestorPayPerPage);
      params.append("creditManager", this.user.id);

      if (this.gestorPayFromDate) params.append("fromDate", this.gestorPayFromDate);
      if (this.gestorPayToDate) params.append("toDate", this.gestorPayToDate);
      if (this.gestorPaySearch) params.append("search", this.gestorPaySearch);
      if (this.gestorPayMethod > 0) params.append("paymentMethod", this.gestorPayMethod);

      axios
        .get(`/api/payments/${this.company.id}/paginated?${params.toString()}`)
        .then((res) => {
          if (res.data.success) {
            this.gestorPayments = res.data.result || [];
            this.gestorPayPagination = res.data.pagination || this.gestorPayPagination;
            this.gestorPayTotals = res.data.totals || this.gestorPayTotals;
          } else {
            this.gestorPayments = [];
          }
        })
        .catch((err) => {
          console.error("Erro ao buscar pagamentos do gestor:", err);
          this.gestorPayments = [];
        })
        .finally(() => {
          this.gestorPayLoading = false;
        });
    },

    clearGestorPayFilters() {
      this.gestorPayFromDate = "";
      this.gestorPayToDate = "";
      this.gestorPayMethod = 0;
      this.gestorPaySearch = "";
      this.fetchGestorPayments(1);
    },

    gestorPayMethodLabel(method) {
      const map = { 1: "Boca do Caixa", 2: "Depósito", 3: "Transferência", 4: "POS", 5: "Cheque", 6: "SISTAFE", 7: "M-Pesa", 8: "E-Mola" };
      return map[method] || "Outro";
    },

    gestorPayMethodVariant(method) {
      const map = { 1: "success", 2: "primary", 3: "info", 4: "secondary", 5: "warning", 6: "dark", 7: "danger", 8: "success" };
      return map[method] || "secondary";
    },

    refreshCustomers() {
      this.fetchCustomers(this.customersPagination.currentPage || 1);
    },

    fetchCustomers(page = 1) {
      this.$store.dispatch("getAllCustomers", {
        companyId: this.company.id,
        page: page,
        limit: this.perPage,
        search: this.searchValues.trim(),
      });
    },

    onSearchInput() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.fetchCustomers(1);
      }, 400);
    },

    clearSearch() {
      this.searchValues = "";
      this.fetchCustomers(1);
    },

    goToPage(page) {
      if (page < 1 || page > this.customersPagination.totalPages) return;
      if (page === this.customersPagination.currentPage) return;
      this.fetchCustomers(page);
    },

    onPerPageChange() {
      this.fetchCustomers(1);
    },

    // ── Utilitários ──
    formatMoney(value) {
      return MoneyFormat.formatMoney(value);
    },

    formatDate(date) {
      if (!date) return "--";
      const parsed = moment(date);
      return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "--";
    },

    getCustomerName(accountNumber) {
      if (this.combinedNameMap[accountNumber]) {
        return this.combinedNameMap[accountNumber];
      }
      return String(accountNumber);
    },

    loanStatusVariant(status) {
      const map = { 0: "warning", 1: "success", "-1": "danger", 3: "info" };
      return map[status] || "secondary";
    },

    loanStatusLabel(status) {
      const map = { 0: "Pendente", 1: "Activo", "-1": "Rejeitado", 3: "Liquidado" };
      return map[status] || "Desconhecido";
    },

    showToast(title, variant, msg) {
      this.$bvToast.toast(msg, {
        title,
        variant,
        solid: true,
        autoHideDelay: 4000,
        toaster: "b-toaster-top-center",
      });
    },

    // ── Pesquisa de Mutuários (agora via paginação server-side) ──

    // ── Cadastro / Edição de Mutuários ──
    editCustomer(customer) {
      this.customerUpdationId = customer.id;
      this.customerForm = { ...customer };
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    resetCustomerForm() {
      this.customerUpdationId = 0;
      this.customerForm = {
        customerName: "", sex: null, customerEmail: "", customerPhone: "",
        customerNuit: "", customerNationalId: "", issuedAt: "", localOfIssue: "",
        customerDateOfBirth: "", customerMonthlySalary: 0, customerAddress: "",
        customerProfession: "", customerLocalOfWork: "", maritalStatus: null,
        customerSpouseName: "", customerSpouseContact: "",
        customerEmergencyPerson: "", customerEmergencyContact: "",
        customerStatus: 0, interestRateId: 0,
      };
    },

    registerOrUpdateCustomer() {
      if (this.customerForm.customerName.length < 6) {
        this.showToast("Aviso", "warning", "Nome deve ter no mínimo 6 caracteres.");
        return;
      }
      if (!this.customerForm.customerPhone || this.customerForm.customerPhone.toString().length < 9) {
        this.showToast("Aviso", "warning", "Verifique o número de telemóvel.");
        return;
      }

      this.$store.commit("LOADING_STATUS", true);
      const payload = { ...this.customerForm, companyId: this.company.id };
      const isNew = this.customerUpdationId === 0;
      const request = isNew
        ? axios.post("/api/customer", payload)
        : axios.put(`/api/customer/${this.customerUpdationId}`, payload);

      request
        .then((res) => {
          if (res.data.success) {
            this.fetchCustomers(this.customersPagination.currentPage || 1);
            this.showToast("Sucesso!", "success", res.data.message);
            this.resetCustomerForm();
          } else {
            this.showToast("Atenção", "danger", res.data.message);
          }
        })
        .catch((err) => this.showToast("Erro", "danger", err.message))
        .finally(() => this.$store.commit("LOADING_STATUS", false));
    },

    // ── Desabilitar / Habilitar Mutuário ──
    toggleCustomerStatus(customer) {
      this.toggleTarget = customer;
      this.$refs["modal-toggle-status"].show();
    },

    confirmToggleStatus() {
      if (!this.toggleTarget) return;
      const newStatus = this.toggleTarget.customerStatus == 0 ? 1 : 0;
      this.$store.commit("LOADING_STATUS", true);
      axios
        .put(`/api/customer/${this.toggleTarget.id}`, { customerStatus: newStatus })
        .then((res) => {
          if (res.data.success) {
            this.showToast("Sucesso!", "success", `Mutuário ${newStatus === 0 ? "habilitado" : "desabilitado"} com sucesso.`);
            this.fetchCustomers(this.customersPagination.currentPage || 1);
          }
        })
        .catch((err) => this.showToast("Erro", "danger", err.message))
        .finally(() => {
          this.$store.commit("LOADING_STATUS", false);
          this.$refs["modal-toggle-status"].hide();
          this.toggleTarget = null;
        });
    },

    // ── Abrir painel do Mutuário ──
    openBorrower(customer) {
      this.selectedCustomer = customer;
      this.$store.commit("SET_CURRENT_CUSTOMER", customer);
      this.activeSection = "borrower";
      this.loadBorrowerData();
    },

    async openBorrowerFromLoan(loan) {
      const customer = this.customers.find((c) => c.accountNumber == loan.accountNumber);
      if (customer) {
        this.openBorrower(customer);
        return;
      }
      try {
        const res = await axios.get(`/api/searchCustomers/${loan.accountNumber}`);
        if (res.data.success && res.data.result.length > 0) {
          const found = res.data.result.find((c) => c.accountNumber == loan.accountNumber);
          if (found) {
            this.openBorrower(found);
            return;
          }
        }
        this.showToast("Aviso", "warning", "Mutuário não encontrado.");
      } catch {
        this.showToast("Erro", "danger", "Erro ao buscar dados do mutuário.");
      }
    },

    async loadBorrowerData() {
      this.docForm.uploadedBy = this.user.name;
      this.docForm.accountNumber = this.selectedCustomer.accountNumber;
      this.borrowerAmortization = [];
      this.borrowerTotal2Pay = 0;
      this.loanForm = {
        capital: 0, juros: null, prestacoes: null,
        loanDescription: "Crédito desembolsado mediante apresentação de garantias",
        dateCreated: "",
      };

      // Recarregar taxas de juros se necessário
      if (this.typeOfCredit.length <= 1 && this.interestRates.length > 0) {
        this.interestRates.forEach((rate) => {
          this.typeOfCredit.push({
            text: `${rate.tax * 100}% - ${rate.name}`,
            value: rate.tax,
          });
        });
      }

      this.getDocuments();
      this.$store.dispatch("getCustomerLoans", this.selectedCustomer.accountNumber);
      this.getCustomerTranzactions();
    },

    // ── Documentos ──
    getDocuments() {
      this.$store.commit("LOADING_STATUS", true);
      axios
        .get(`/api/document/${this.selectedCustomer.accountNumber}`)
        .then((res) => {
          this.borrowerDocuments = res.data && res.data.success ? res.data.result : [];
        })
        .catch(() => { this.borrowerDocuments = []; })
        .finally(() => this.$store.commit("LOADING_STATUS", false));
    },

    onFileChange(e) {
      this.selectedFile = e.target.files[0];
    },

    onUploadFile() {
      if (!this.selectedFile || !this.docForm.documentName) return;
      this.uploadCustomerDocument();
    },

    uploadCustomerDocument() {
      this.$store.commit("LOADING_STATUS", true);
      const formData = new FormData();
      formData.append("file", this.selectedFile);
      formData.append("companyId", String(this.company.id));
      formData.append("accountNumber", String(this.selectedCustomer.accountNumber));
      formData.append("documentName", this.docForm.documentName);
      formData.append("uploadedBy", this.user.name);
      axios
        .post("/api/document", formData)
        .then((res) => {
          if (res.data.success) {
            this.showToast("Sucesso!", "success", res.data.message);
            const logsParams = logs(
              this.user,
              `${this.docForm.documentName} carregado.`,
              "Cadastro de documentos"
            );
            this.$store.dispatch("addLog", logsParams);
            this.getDocuments();
            this.docForm.documentName = null;
            this.docForm.documentFileUrl = "";
            this.selectedFile = "";
          }
        })
        .catch((err) => this.showToast("Erro!", "danger", err.message))
        .finally(() => this.$store.commit("LOADING_STATUS", false));
    },

    deleteDocument(doc) {
      this.documentDeletionId = doc.id;
      this.$refs["modal-delete-doc"].show();
    },

    confirmDeleteDoc() {
      this.$store.commit("LOADING_STATUS", true);
      axios
        .delete(`/api/document/${this.documentDeletionId}`)
        .then((res) => {
          if (res.data.success) {
            this.showToast("Sucesso!", "success", res.data.message);
            this.getDocuments();
          }
        })
        .catch((err) => this.showToast("Erro!", "danger", err.message))
        .finally(() => {
          this.$store.commit("LOADING_STATUS", false);
          this.$refs["modal-delete-doc"].hide();
        });
    },

    // ── Simulação e Concessão de Crédito ──
    getCustomerTranzactions() {
      axios
        .get(`/api/tranzaction/${this.selectedCustomer.accountNumber}`)
        .then((res) => {
          if (res.data && res.data.success) {
            this.$store.commit("SET_CUSTOMER_TRANZACTIONS", res.data.result);
          } else {
            this.$store.commit("SET_CUSTOMER_TRANZACTIONS", []);
          }
        })
        .catch(() => this.$store.commit("SET_CUSTOMER_TRANZACTIONS", []));
    },

    previewSimulator() {
      if (this.loanForm.capital < 100) {
        this.showToast("Aviso!", "warning", "O crédito deve ser maior que 100.00 MZN");
        return;
      }
      if (this.loanForm.juros == null) {
        this.showToast("Aviso!", "warning", "Seleccione a taxa de juros");
        return;
      }
      if (this.loanForm.prestacoes == null) {
        this.showToast("Aviso!", "warning", "Seleccione o número de prestações");
        return;
      }

      this.borrowerAmortization = loanSimulator(this.loanForm);
      const installment = this.borrowerAmortization[0].installment;
      const maxCapacity = parseFloat(this.selectedCustomer.customerMonthlySalary) / 3;
      this.borrowerElegibility = installment <= maxCapacity;
      this.borrowerTotal2Pay = this.borrowerAmortization.reduce((sum, p) => sum + p.installment, 0);
    },

    createLoan() {
      if (this.loanForm.loanDescription.length < 10) {
        this.showToast("Aviso!", "warning", "O parecer técnico é de preenchimento obrigatório.");
        return;
      }

      this.$store.commit("LOADING_STATUS", true);
      const passingValues = {
        accountNumber: this.selectedCustomer.accountNumber,
        companyId: this.company.id,
        amount: this.loanForm.capital,
        numberOfInstallments: this.loanForm.prestacoes,
        interestRate: this.loanForm.juros,
        creditManager: this.user.id, // O próprio gestor é o creditManager
        dateCreated: this.loanForm.dateCreated,
        loanDescription: this.loanForm.loanDescription,
        status: 0, // Pendente - Admin é quem aprova
      };

      axios
        .post("/api/loan", passingValues)
        .then((res) => {
          if (res.data.success) {
            const logsParams = logs(
              this.user,
              `Conta ${passingValues.accountNumber} - crédito de ${this.formatMoney(passingValues.amount)} a ${passingValues.interestRate * 100}%. Prestações: ${passingValues.numberOfInstallments}.`,
              "Novo financiamento"
            );
            this.$store.dispatch("addLog", logsParams);
            this.borrowerAmortization = [];
            this.$store.dispatch("getCustomerLoans", this.selectedCustomer.accountNumber);
            this.$store.dispatch("getCompanyLoans", this.company.id);
            this.showToast("Sucesso!", "success", "Crédito submetido para aprovação.");
          } else {
            this.showToast("Erro!", "danger", res.data.message);
          }
        })
        .catch((err) => this.showToast("Erro!", "danger", err.message))
        .finally(() => this.$store.commit("LOADING_STATUS", false));
    },

    // ── Logout ──
    logoutUser() {
      const logsParams = logs(this.user, `${this.user.email} - ${this.user.name} terminou a sessão.`, "Autenticação");
      this.$store.dispatch("addLog", logsParams).then(() => {
        this.$store.dispatch("actionDoLogout");
        this.$router.push("/");
      });
    },
  },

  watch: {
    company(val) {
      if (val && val.id) {
        this.loadInitialData();
        if (!this.customersNameMap || Object.keys(this.customersNameMap).length === 0) {
          this.$store.dispatch("getCustomersNameMap", val.id);
        }
      }
    },
    instRangeFilter() { this.instCurrentPage = 1; },
    instDateFrom() { this.instCurrentPage = 1; },
    instDateTo() { this.instCurrentPage = 1; },
    gestorNotifFilter() { this.gestorNotifPage = 1; },
    activeSection(val) {
      if (val === "notificacoes" && this.gestorAllNotifs.length === 0) {
        this.fetchGestorNotifs();
      }
      if (val === "pagamentos" && this.gestorPayments.length === 0) {
        this.fetchGestorPayments(1);
      }
    },
  },
};
</script>

<style scoped>
/* Cores MBR */
.text-mbr-green { color: #009640 !important; }
.bg-mbr-green { background-color: #009640 !important; }
.navbar-mbr { background: linear-gradient(90deg, #009640 0%, #007a33 100%); border-bottom: 3px solid #c5a065; }
.brand-text { font-size: 1.3rem; letter-spacing: 1px; color: white; }
.logo-wrapper { border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid rgba(255,255,255,0.2); }

/* NavLinks */
.nav-links .nav-link { color: rgba(255,255,255,0.85) !important; font-weight: 500; padding: 0.5rem 1rem !important; transition: all 0.3s ease; border-bottom: 2px solid transparent; }
.nav-links .nav-link:hover { color: white !important; background-color: rgba(255,255,255,0.1); border-radius: 4px; }
.nav-links .active .nav-link, .nav-links .active { color: white !important; border-bottom: 2px solid #c5a065 !important; }

.user-badge { background-color: rgba(0,0,0,0.15); border-radius: 50px; transition: background 0.3s; }
.user-badge:hover { background-color: rgba(0,0,0,0.25); }
.opacity-75 { opacity: 0.75; }

/* Cards */
.stat-card { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; }
.icon-shape { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 1.2rem; }
.bg-soft-info { background-color: rgba(23,162,184,0.1); }
.bg-soft-warning { background-color: rgba(255,193,7,0.1); }
.bg-soft-success { background-color: rgba(0,150,64,0.1); }
.bg-soft-danger { background-color: rgba(220,53,69,0.1); }
.kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #888; }

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

.risk-card { border-left: 4px solid #ffc107 !important; }

/* Botão MBR */
.btn-mbr-primary { background-color: #009640; transition: all 0.3s; }
.btn-mbr-primary:hover { background-color: #007a33; box-shadow: 0 4px 6px rgba(0,150,64,0.2); }
.btn-mbr-green { background-color: #009640 !important; color: white !important; border: none; }

/* Sections */
.section-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #c5a065; font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px; }
.section-header { background-color: #f8f9fa; font-weight: 600; font-size: 0.85rem; color: #333; border-bottom: 2px solid #009640; }
.form-field-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: #6c757d;
}

/* Customer avatar */
.customer-avatar { width: 50px; height: 50px; background: linear-gradient(135deg, #009640, #007a33); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; }
.borrower-header-card {
  border-left: 4px solid #009640;
}
.borrower-mini-stat {
  background: #f8fafb;
  border: 1px solid #edf1f4;
  border-radius: 10px;
  padding: 8px 10px;
}
.borrower-mini-label {
  display: block;
  color: #6c757d;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.borrower-mini-value {
  color: #212529;
  font-size: 0.92rem;
}
.borrower-doc-item {
  border-left: 3px solid rgba(0, 150, 64, 0.16);
}
.borrower-simulation-body {
  background: linear-gradient(180deg, #fcfdfd 0%, #ffffff 100%);
}
.borrower-capacity-strip {
  border: 1px solid #edf1f4;
  border-radius: 10px;
  background: #f8fafb;
  padding: 8px 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.capacity-item {
  min-width: 0;
}
.capacity-label {
  display: block;
  color: #6c757d;
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.capacity-value {
  font-size: 0.9rem;
  color: #212529;
}
.submission-guidance {
  border: 1px solid #edf1f4;
  border-radius: 10px;
  background: #f8fafb;
}
.borrower-history-body {
  border-top: 1px solid #eef1f4;
}
.borrower-amortization-table {
  font-size: 0.74rem;
}
.borrower-amortization-table th,
.borrower-amortization-table td {
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
}

/* Summary cards */
.summary-card { padding: 10px 12px; border-radius: 8px; border-left: 3px solid #ddd; background: #fafafa; }
.summary-label { display: block; font-size: 0.7rem; text-transform: uppercase; color: #999; }
.summary-value { font-size: 0.95rem; color: #333; }
.summary-capital { border-left-color: #009640; }
.summary-rate { border-left-color: #007bff; }
.summary-installments { border-left-color: #ffc107; }
.summary-total { border-left-color: #dc3545; }

/* Table */
.cursor-pointer { cursor: pointer; }
.table-hover tbody tr:hover { background-color: rgba(0,150,64,0.05); }

/* Paginação */
.pagination .page-link { color: #009640; border-color: #dee2e6; min-width: 32px; text-align: center; }
.pagination .page-item.active .page-link { background-color: #009640; border-color: #009640; color: #fff; }
.pagination .page-item.disabled .page-link { color: #adb5bd; }
.pagination .page-link:hover { background-color: rgba(0,150,64,0.1); color: #007a33; }

/* ── Notificações ── */
.notification-bell {
  padding: 6px 10px; border-radius: 50%; transition: background 0.2s; cursor: pointer;
}
.notification-bell:hover { background: rgba(255,255,255,0.15); }
.notification-badge {
  position: absolute; top: 0; right: 2px; font-size: 0.6rem;
  min-width: 16px; height: 16px; line-height: 16px; padding: 0 4px;
  animation: notifPulse 2s infinite;
}
@keyframes notifPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(220,53,69,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(220,53,69,0); }
}
.notification-item { border-bottom: 1px solid #f0f0f0; }
.notification-item:last-child { border-bottom: none; }
.unread-notif { background-color: #f0faf4; }
.notif-icon {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.notif-type-loan_request { background: #fff3cd; color: #856404; }
.notif-type-loan_approved { background: #d4edda; color: #155724; }
.notif-type-loan_rejected { background: #f8d7da; color: #721c24; }
.notif-type-loan_disbursed { background: #d1ecf1; color: #0c5460; }
.notif-type-payment_received { background: #d4edda; color: #155724; }
.notif-type-installment_due { background: #fff3cd; color: #856404; }
.notif-type-installment_overdue { background: #f8d7da; color: #721c24; }
.notif-type-general { background: #d1ecf1; color: #0c5460; }
.unread-dot-green {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #009640;
}

/* Prestações */
.avatar-circle-sm { width: 32px; height: 32px; background-color: #e9ecef; color: #495057; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.75rem; flex-shrink: 0; }
.btn-mbr-green-light { background-color: rgba(0,150,64,0.1); color: #009640; border: none; font-weight: 600; }
.btn-mbr-green-light:hover { background-color: #009640; color: white; }
.btn-outline-mbr-green { color: #009640; border-color: #009640; }
.btn-outline-mbr-green:hover { background-color: #009640; color: white; }
.mbr-radio-group .btn-outline-mbr { border-color: #dee2e6; color: #6c757d; background-color: white; }
.mbr-radio-group .btn-outline-mbr:not(:disabled):not(.disabled).active { background-color: #009640; border-color: #009640; color: white; }
.badge-soft-warning { background-color: #fff3cd; color: #856404; }
.badge-soft-success { background-color: #d4edda; color: #155724; }
.badge-soft-danger { background-color: #f8d7da; color: #721c24; }

/* Notificações */
.gestor-notif-unread { border-left: 3px solid #009640 !important; background-color: #f8fdf9; }
.notif-icon-circle-sm { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

@media (max-width: 991.98px) {
  .nav-links { margin-left: 0 !important; padding: 1rem 0; }
  .user-badge { margin-top: 1rem; justify-content: center; }
  .borrower-capacity-strip {
    grid-template-columns: 1fr;
  }
}
</style>
