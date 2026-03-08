<template>
  <div class="borrower-view">
    <NavBarVue />
    <b-container fluid>
      <div class="page-content">

        <!-- ===================== HEADER: INFO DO CLIENTE ===================== -->
        <b-card class="customer-header mb-3" no-body>
          <b-card-body class="py-3 px-4">
            <b-row align-v="center">
              <b-col cols="auto">
                <div class="customer-avatar">
                  <b-icon icon="person-fill" font-scale="1.8"></b-icon>
                </div>
              </b-col>
              <b-col>
                <h5 class="mb-0 customer-name">{{ currentCustomer.customerName }}</h5>
                <small class="text-muted d-block">
                  <b-icon icon="credit-card" class="mr-1"></b-icon>
                  Conta: <strong>{{ currentCustomer.accountNumber }}</strong>
                </small>
                <div class="mt-2 d-flex align-items-center flex-wrap" style="gap: 8px;">
                  <b-badge pill :variant="borrowerStatusVariant" class="px-2 py-1">
                    <b-icon :icon="borrowerStatusVariant === 'success' ? 'person-check-fill' : 'person-dash-fill'" class="mr-1"></b-icon>
                    {{ borrowerStatusLabel }}
                  </b-badge>
                  <small class="text-muted">
                    <b-icon icon="telephone-fill" class="mr-1"></b-icon>
                    {{ currentCustomer.customerPhone || "Sem telefone" }}
                  </small>
                  <small class="text-muted">
                    <b-icon icon="envelope-fill" class="mr-1"></b-icon>
                    {{ currentCustomer.customerEmail || "Sem e-mail" }}
                  </small>
                </div>
              </b-col>
              <b-col cols="auto" class="text-right">
                <div class="salary-info">
                  <small class="text-muted d-block">Rendimento mensal</small>
                  <span class="salary-value">{{ currentCustomerSalary }}</span>
                  <small class="text-muted d-block mt-1">
                    <b-icon icon="briefcase-fill" class="mr-1"></b-icon>
                    {{ currentCustomer.customerProfession || "Profissão não informada" }}
                  </small>
                </div>
              </b-col>
              <b-col cols="auto" v-if="customerLoanAmortization.length > 0">
                <b-badge
                  :variant="elegibility ? 'success' : 'warning'"
                  class="elegibility-badge"
                >
                  <b-icon :icon="elegibility ? 'check-circle-fill' : 'exclamation-triangle-fill'" class="mr-1"></b-icon>
                  {{ elegibility ? 'Elegível' : 'Capacidade excedida' }}
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
                  <strong class="borrower-mini-value">{{ customerDocuments.length }}</strong>
                </div>
              </b-col>
              <b-col lg="3" md="6" class="mb-2">
                <div class="borrower-mini-stat">
                  <small class="borrower-mini-label">Prestação simulada</small>
                  <strong class="borrower-mini-value text-primary">
                    {{ estimatedInstallment > 0 ? convertMoney(estimatedInstallment) : "—" }}
                  </strong>
                </div>
              </b-col>
            </b-row>
          </b-card-body>
        </b-card>

        <!-- ===================== LAYOUT DUAS COLUNAS ===================== -->
        <b-row>

          <!-- ========= COLUNA ESQUERDA: DOCUMENTOS ========= -->
          <b-col lg="3" md="4" sm="12">

            <!-- Card: Upload de Documentos -->
            <b-card class="section-card mb-3" no-body>
              <b-card-header class="section-header">
                <b-icon icon="file-earmark-plus" class="mr-2"></b-icon>
                Adicionar Documentos
              </b-card-header>
              <b-card-body>
                <b-form-group label="Tipo de documento" label-size="sm" class="mb-2">
                  <b-input-group size="sm">
                    <b-input-group-prepend is-text>
                      <b-icon icon="file-earmark-pdf"></b-icon>
                    </b-input-group-prepend>
                    <b-form-select
                      size="sm"
                      v-model="form.documentName"
                      :options="documentTypeOptions"
                    ></b-form-select>
                  </b-input-group>
                </b-form-group>

                <b-form-group label="Selecionar ficheiro" label-size="sm" class="mb-2">
                  <b-form-file
                    accept="*"
                    @change="onFileChange"
                    size="sm"
                    placeholder="Escolher ficheiro..."
                    drop-placeholder="Arraste o ficheiro aqui..."
                  ></b-form-file>
                </b-form-group>

                <b-progress
                  :value="uploadValue"
                  :max="100"
                  show-progress
                  animated
                  class="mb-2"
                  variant="info"
                  v-if="uploadValue > 0"
                ></b-progress>

                <b-button
                  :disabled="isLoading || uploadValue > 0 || !selectedFile || !form.documentName"
                  type="submit"
                  size="sm"
                  variant="secondary"
                  @click="onUploadFile()"
                  block
                  class="btn-upload"
                >
                  <b-icon icon="cloud-upload-fill" class="mr-1"></b-icon>
                  Salvar documento
                </b-button>
              </b-card-body>
            </b-card>

            <!-- Card: Documentos Submetidos -->
            <b-card class="section-card mb-3" no-body>
              <b-card-header class="section-header">
                <b-icon icon="list-check" class="mr-2"></b-icon>
                Documentos submetidos
                <b-badge variant="secondary" pill class="ml-2">{{ customerDocuments.length }}</b-badge>
              </b-card-header>
              <div v-if="customerDocuments.length === 0" class="text-center py-4 px-3 text-muted">
                <b-icon icon="file-earmark-x" font-scale="1.6" class="mb-2"></b-icon>
                <div class="small">Nenhum documento submetido</div>
              </div>
              <b-list-group v-else flush>
                <b-list-group-item
                  class="d-flex justify-content-between align-items-center doc-item borrower-doc-item"
                  v-for="(doc, index) in customerDocuments"
                  :key="doc.id"
                >
                  <div class="doc-info">
                    <small class="text-muted mr-1">{{ index + 1 }}.</small>
                    <small class="doc-name d-block">{{ doc.documentName }}</small>
                    <small class="text-muted">
                      {{ doc.createdAt ? `Submetido em ${formatDate(doc.createdAt)}` : "Data de submissão indisponível" }}
                    </small>
                  </div>
                  <div class="doc-actions">
                    <b-button
                      variant="outline-danger"
                      size="sm"
                      class="btn-doc-action mr-1"
                      @click="deleteDocument(doc)"
                    >
                      <b-icon icon="trash-fill" font-scale="0.8"></b-icon>
                    </b-button>
                    <a :href="doc.documentFileUrl" target="_blank">
                      <b-button
                        variant="outline-secondary"
                        size="sm"
                        class="btn-doc-action"
                        v-b-tooltip.hover
                        title="Abrir/transferir"
                      >
                        <b-icon icon="box-arrow-up-right" font-scale="0.8"></b-icon>
                      </b-button>
                    </a>
                  </div>
                </b-list-group-item>
              </b-list-group>
            </b-card>
          </b-col>

          <!-- ========= COLUNA DIREITA: SIMULAÇÃO E CRÉDITO ========= -->
          <b-col lg="9" md="8" sm="12">
            <b-overlay :show="isLoading" rounded="sm">

              <!-- Card: Simulação de Crédito -->
              <b-card class="section-card mb-3" no-body>
                <b-card-header class="section-header d-flex justify-content-between align-items-center">
                  <div>
                    <b-icon icon="calculator" class="mr-2"></b-icon>
                    Simulação de Crédito
                    <small class="d-block text-muted font-weight-normal mt-1">
                      Defina valor, prazo e taxa para validar capacidade de pagamento.
                    </small>
                  </div>
                  <b-button
                    variant="primary"
                    size="sm"
                    class="btn-simulate"
                    @click="previewSimulator()"
                  >
                    <b-icon icon="play-fill" class="mr-1"></b-icon>
                    Simular
                  </b-button>
                </b-card-header>
                <b-card-body class="borrower-simulation-body">
                  <b-row>
                    <b-col lg="6" md="6" sm="12" class="mb-2">
                      <b-form-group label="Montante do crédito (MZN)" label-size="sm" class="mb-0">
                        <b-form-input
                          type="number"
                          min="100"
                          step="any"
                          size="sm"
                          v-model="loan.capital"
                          placeholder="Min. 100.00 MZN"
                        ></b-form-input>
                      </b-form-group>
                    </b-col>
                    <b-col lg="3" md="3" sm="6" class="mb-2">
                      <b-form-group label="N. de prestações" label-size="sm" class="mb-0">
                        <b-form-select
                          v-model="loan.prestacoes"
                          size="sm"
                          :options="numeroPrestacoes"
                          required
                        ></b-form-select>
                      </b-form-group>
                    </b-col>
                    <b-col lg="3" md="3" sm="6" class="mb-2">
                      <b-form-group label="Taxa de juros" label-size="sm" class="mb-0">
                        <b-form-select
                          v-model="loan.juros"
                          size="sm"
                          :options="typeOfCredit"
                          required
                        ></b-form-select>
                      </b-form-group>
                    </b-col>
                  </b-row>
                  <div class="borrower-capacity-strip mt-3">
                    <div class="capacity-item">
                      <small class="capacity-label">Capacidade máxima (1/3)</small>
                      <strong class="capacity-value">{{ convertMoney(maxInstallmentCapacity) }}</strong>
                    </div>
                    <div class="capacity-item">
                      <small class="capacity-label">Prestação simulada</small>
                      <strong class="capacity-value">
                        {{ estimatedInstallment > 0 ? convertMoney(estimatedInstallment) : "—" }}
                      </strong>
                    </div>
                    <div class="capacity-item">
                      <small class="capacity-label">Margem</small>
                      <strong class="capacity-value" :class="installmentDeltaClass">
                        {{ estimatedInstallment > 0 ? convertMoney(Math.abs(installmentDelta)) : "—" }}
                      </strong>
                    </div>
                  </div>
                </b-card-body>
              </b-card>

              <!-- Card: Plano de Amortização (condicional) -->
              <b-card
                class="section-card mb-3"
                no-body
                v-if="customerLoanAmortization.length > 0"
              >
                <b-card-header class="section-header d-flex justify-content-between align-items-center">
                  <div>
                    <b-icon icon="table" class="mr-2"></b-icon>
                    Plano de Amortização
                  </div>
                  <b-button
                    variant="outline-secondary"
                    size="sm"
                    @click="closeSimulater()"
                  >
                    <b-icon icon="x-lg" class="mr-1"></b-icon>
                    Fechar
                  </b-button>
                </b-card-header>
                <b-card-body class="pb-2">

                  <!-- Resumo Financeiro -->
                  <b-row class="mb-3">
                    <b-col lg="3" md="6" sm="6" class="mb-2">
                      <div class="summary-card summary-capital">
                        <small class="summary-label">Capital a financiar</small>
                        <strong class="summary-value">{{ convertMoney(loan.capital) }}</strong>
                      </div>
                    </b-col>
                    <b-col lg="3" md="6" sm="6" class="mb-2">
                      <div class="summary-card summary-rate">
                        <small class="summary-label">Taxa de juros</small>
                        <strong class="summary-value">{{ loan.juros * 100 }}%</strong>
                      </div>
                    </b-col>
                    <b-col lg="3" md="6" sm="6" class="mb-2">
                      <div class="summary-card summary-installments">
                        <small class="summary-label">N. de prestações</small>
                        <strong class="summary-value">{{ loan.prestacoes }}</strong>
                      </div>
                    </b-col>
                    <b-col lg="3" md="6" sm="6" class="mb-2">
                      <div class="summary-card summary-total">
                        <small class="summary-label">Total a pagar</small>
                        <strong class="summary-value" v-money-format="total2Pay"></strong>
                      </div>
                    </b-col>
                  </b-row>

                  <!-- Tabela de Amortização -->
                  <div class="table-responsive">
                    <table class="table table-sm table-hover amortization-table borrower-amortization-table">
                      <thead>
                        <tr class="table-header-row">
                          <th>Ordem</th>
                          <th class="text-right">Amortização</th>
                          <th class="text-right">Juros</th>
                          <th class="text-right">Prestação</th>
                          <th class="text-right">Saldo Devedor</th>
                          <th class="text-right">Vencimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="amortization in customerLoanAmortization"
                          :key="amortization.id"
                          class="amortization-row"
                        >
                          <td>{{ amortization.installmentOrder }}</td>
                          <td v-money-format="amortization.capitalPerInstall" class="text-right"></td>
                          <td v-money-format="amortization.rateAmount" class="text-right"></td>
                          <td v-money-format="amortization.installment" class="text-right"></td>
                          <td class="text-right">
                            <span v-if="amortization.remainingBalance !== undefined && amortization.remainingBalance !== null">
                              {{ convertMoney(amortization.remainingBalance) }}
                            </span>
                            <span v-else class="text-muted">-</span>
                          </td>
                          <td v-date-format="amortization.dueDate" class="text-right"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </b-card-body>
              </b-card>

              <!-- Card: Submissão do Crédito (condicional) -->
              <b-card
                class="section-card mb-3"
                no-body
                v-if="customerLoanAmortization.length > 0"
              >
                <b-card-header class="section-header">
                  <b-icon icon="send" class="mr-2"></b-icon>
                  Submissão do Crédito
                </b-card-header>
                <b-card-body>
                  <b-row>
                    <b-col lg="5" md="12" class="mb-2">
                      <b-form-group
                        label="Parecer técnico"
                        label-size="sm"
                        label-class="font-weight-bold"
                        class="mb-0"
                      >
                        <b-form-textarea
                          id="textarea-formatter"
                          v-model="loan.loanDescription"
                          placeholder="Observações e parecer técnico sobre o crédito..."
                          rows="3"
                          size="sm"
                        ></b-form-textarea>
                      </b-form-group>
                    </b-col>
                    <b-col lg="3" md="6" class="mb-2">
                      <b-form-group
                        label="Data de submissão"
                        label-size="sm"
                        label-class="font-weight-bold"
                        class="mb-0"
                      >
                        <b-form-input
                          type="date"
                          size="sm"
                          v-model="loan.dateCreated"
                          disabled
                        ></b-form-input>
                      </b-form-group>
                    </b-col>
                    <b-col lg="4" md="6" class="mb-2">
                      <b-form-group
                        label="Gestor de crédito"
                        label-size="sm"
                        label-class="font-weight-bold"
                        class="mb-0"
                      >
                        <b-form-select
                          v-model="loan.creditManager"
                          size="sm"
                          :options="creditManangers"
                          required
                        ></b-form-select>
                      </b-form-group>
                    </b-col>
                    <b-col lg="4" md="12" class="mb-2">
                      <div class="submission-guidance p-3 h-100">
                        <div class="font-weight-bold text-dark mb-2">
                          <b-icon icon="shield-check" class="mr-1 text-success"></b-icon>
                          Verificação antes da submissão
                        </div>
                        <small class="d-block text-muted mb-1">
                          Limite recomendado: {{ convertMoney(maxInstallmentCapacity) }}
                        </small>
                        <small class="d-block" :class="installmentDeltaClass">
                          {{
                            installmentDelta >= 0
                              ? `Margem disponível: ${convertMoney(installmentDelta)}`
                              : `Excesso sobre limite: ${convertMoney(Math.abs(installmentDelta))}`
                          }}
                        </small>
                      </div>
                    </b-col>
                  </b-row>
                  <hr class="my-2" />
                  <div class="d-flex justify-content-end">
                    <b-button
                      :disabled="isLoading"
                      variant="outline-secondary"
                      size="sm"
                      class="mr-2"
                      @click="closeSimulater()"
                    >
                      <b-icon icon="x-lg" class="mr-1"></b-icon>
                      Cancelar
                    </b-button>
                    <b-button
                      :disabled="isLoading || !elegibility"
                      variant="success"
                      size="sm"
                      class="btn-submit"
                      @click="createLoan()"
                      v-b-tooltip.hover
                      :title="!elegibility ? 'Prestação excede 1/3 do rendimento mensal' : ''"
                    >
                      <b-icon icon="telegram" class="mr-1"></b-icon>
                      Submeter Crédito
                    </b-button>
                  </div>
                </b-card-body>
              </b-card>

              <!-- Card: Histórico de Empréstimos -->
              <b-card class="section-card mb-3" no-body>
                <b-card-header class="section-header d-flex justify-content-between align-items-center flex-wrap">
                  <div>
                    <b-icon icon="clock-history" class="mr-2"></b-icon>
                    Histórico de Empréstimos
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

            </b-overlay>
          </b-col>
        </b-row>

      </div>
    </b-container>

    <!-- Modal de confirmação de eliminação -->
    <b-modal hide-footer ref="delete-document" title="Confirmar Eliminação" centered>
      <div class="text-center py-3">
        <b-icon icon="exclamation-triangle-fill" variant="danger" font-scale="2.5" class="mb-3"></b-icon>
        <p class="text-danger mb-0">
          Deseja realmente eliminar este documento?
        </p>
        <small class="text-muted">Esta acção não pode ser revertida.</small>
      </div>
      <hr />
      <div class="d-flex justify-content-end">
        <b-button size="sm" variant="outline-secondary" class="mr-2" @click="cancelDeletion()">
          Cancelar
        </b-button>
        <b-button size="sm" variant="danger" @click="decidedToDelete()">
          <b-icon icon="trash-fill" class="mr-1"></b-icon>
          Eliminar
        </b-button>
      </div>
    </b-modal>
  </div>
</template>

<script>
import axios from "axios";
import { mapGetters } from "vuex";
import NavBarVue from "@/components/NavBar";
import LoansItems from "@/components/loans/LoansItems";
import MoneyFormat from "../utils/moneyFormat";
import logs from "@/utils/logs";
import loanSimulator from "@/utils/loanAmortization";
import moment from "moment";

export default {
  name: "BorrowerView",

  components: {
    NavBarVue,
    LoansItems,
  },

  data: () => ({
    form: {
      accountNumber: "",
      documentFileUrl: "",
      documentName: null,
      uploadedBy: "",
    },

    documentTypeOptions: [
      { text: "Selecionar tipo de documento", value: null },
      { text: "BI / Passaporte / Carta de condução", value: "BI / Passaporte / Carta de condução" },
      { text: "NUIT", value: "NUIT" },
      { text: "Alvará", value: "Alvará" },
      { text: "Declaração do bairro", value: "Declaração do bairro" },
      { text: "Contrato autenticado", value: "Contrato autenticado" },
      { text: "Comprovativo de rendimentos", value: "Comprovativo de rendimentos" },
    ],

    today: moment(),

    loan: {
      capital: 0,
      juros: null,
      prestacoes: null,
      creditManager: null,
      loanDescription:
        "Crédito desembolsado mediante apresentação de garantias",
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
    creditManangers: [{ text: "Selecionar Gestor de Crédito", value: null }],
    customerLoanAmortization: [],
    total2Pay: 0,

    selectedFile: "",
    uploadValue: 0,
    documentDeletionId: 0,
    customerDocuments: [],
    tranzactions: [],
    currentCustomerSalary: 0,
    maximumCapacity: 0,
    elegibility: false,
  }),

  created() {
    this.$store.dispatch("getAllUsers", this.company.id);
    // this.creditManangers = this.users;
    this.form.uploadedBy = this.user.name;
    this.form.accountNumber = this.currentCustomer.accountNumber;
    this.getDocuments();

    this.interestRates.forEach((rate) => {
      let item = { text: `${rate.tax * 100}% - ${rate.name}`, value: rate.tax };
      this.typeOfCredit.push(item);
    });

    this.users.forEach((user) => {
      let item = { text: user.name, value: user.id };
      this.creditManangers.push(item);
    });

    this.currentCustomerSalary = MoneyFormat.formatMoney(
      this.currentCustomer.customerMonthlySalary
    );
    this.getCustomerLoans();
    this.getCustomerTranzactions();
  },

  computed: {
    ...mapGetters([
      "isLoading",
      "user",
      "users",
      "token",
      "currentCustomer",
      "customerLoans",
      "interestRates",
      "company",
    ]),
    borrowerLoansCount() {
      return (this.customerLoans || []).length;
    },
    borrowerActiveLoansCount() {
      return (this.customerLoans || []).filter((loan) => Number(loan.status) === 1).length;
    },
    maxInstallmentCapacity() {
      return (parseFloat(this.currentCustomer?.customerMonthlySalary) || 0) / 3;
    },
    estimatedInstallment() {
      if (!this.customerLoanAmortization || this.customerLoanAmortization.length === 0) return 0;
      return Number(this.customerLoanAmortization[0].installment || 0);
    },
    installmentDelta() {
      if (!this.estimatedInstallment) return this.maxInstallmentCapacity;
      return this.maxInstallmentCapacity - this.estimatedInstallment;
    },
    installmentDeltaClass() {
      return this.installmentDelta >= 0 ? "text-success" : "text-danger";
    },
    borrowerStatusVariant() {
      return Number(this.currentCustomer?.customerStatus) === 0 ? "success" : "danger";
    },
    borrowerStatusLabel() {
      return Number(this.currentCustomer?.customerStatus) === 0 ? "Mutuário activo" : "Mutuário desabilitado";
    },
  },

  methods: {
    getDocuments() {
      this.selectedFile = "";
      this.uploadValue = 0;
      this.form.documentFileUrl = "";
      this.form.documentName = null;

      this.$store.commit("LOADING_STATUS", true);
      axios
        .get(`/api/document/${this.currentCustomer.accountNumber}`)
        .then((res) => {
          const data = res.data;
          if (data.success == true) {
            this.customerDocuments = data.result;
          } else {
            this.showToast("Erro!", "danger", data.message);
            this.customerDocuments = [];
          }
          this.$store.commit("LOADING_STATUS", false);
        })
        .catch((err) => {
          this.showToast("Erro!", "danger", err.message);
          this.$store.commit("LOADING_STATUS", false);
          this.customerDocuments = [];
        });
    },

    closeSimulater() {
      this.customerLoanAmortization = [];
    },

    getCustomerTranzactions() {
      this.$store.commit("LOADING_STATUS", true);
      axios
        .get(`/api/tranzaction/${this.currentCustomer.accountNumber}`)
        .then((res) => {
          const data = res.data;
          if (data.success == true) {
            this.$store.commit("SET_CUSTOMER_TRANZACTIONS", data.result);
          } else {
            this.showToast("Erro!", "danger", data.message);
            this.$store.commit("SET_CUSTOMER_TRANZACTIONS", []);
          }
          this.$store.commit("LOADING_STATUS", false);
        })
        .catch((err) => {
          this.showToast("Erro!", "danger", err.message);
          this.$store.commit("LOADING_STATUS", false);
          this.$store.commit("SET_CUSTOMER_TRANZACTIONS", []);
        });
    },

    getCustomerLoans() {
      this.$store.dispatch(
        "getCustomerLoans",
        this.currentCustomer.accountNumber
      );
    },

    createLoan() {
      if (this.loan.loanDescription.length < 10) {
        this.showToast(
          "Avizo!",
          "warning",
          "O parecer técnico é de preenchimento obrigatório."
        );
        return;
      }

      if (this.loan.creditManager == null) {
        this.showToast("Avizo!", "warning", "Seleccione o Gestor De Crédito");
        return;
      }

      if (this.loan.prestacoes == null) {
        this.showToast(
          "Avizo!",
          "warning",
          "Seleccione o número de prestações por favor"
        );
        return;
      }

      this.$store.commit("LOADING_STATUS", true);

      const passingValues = {
        accountNumber: this.currentCustomer.accountNumber,
        companyId: this.company.id,
        amount: this.loan.capital,
        numberOfInstallments: this.loan.prestacoes,
        interestRate: this.loan.juros,
        creditManager: this.loan.creditManager,
        dateCreated: this.loan.dateCreated,
        loanDescription: this.loan.loanDescription,
        status: 0,
      };

      axios
        .post(`/api/loan`, passingValues)
        .then((res) => {
          const data = res.data;
          if (data.success == true) {
            const logsParams = logs(
              this.user,
              `A conta ${
                passingValues.accountNumber
              } recebeu um financiamento de ${this.convertMoney(
                passingValues.amount
              )} a uma taxa de juros de ${
                passingValues.interestRate * 100
              }%. Nº de prestações: ${passingValues.numberOfInstallments}.`,
              "Novo financiamento"
            );
            this.$store.dispatch("addLog", logsParams);
            this.customerLoanAmortization = [];
            this.getCustomerLoans();
          } else {
            this.showToast("Erro!", "danger", data.message);
          }
          this.$store.commit("LOADING_STATUS", false);
        })
        .catch((err) => {
          this.showToast("Erro!", "danger", err.message);
          this.$store.commit("LOADING_STATUS", false);
          this.customerLoans = [];
        });
    },

    convertMoney(value) {
      return MoneyFormat.formatMoney(value);
    },

    previewSimulator() {
      if (this.loan.capital < 100) {
        this.showToast(
          "Avizo!",
          "warning",
          "O crédito deve ser maior que 100.00 MZN"
        );
      } else if (this.loan.juros == null) {
        this.showToast(
          "Avizo!",
          "warning",
          "Seleccione a taxa de juros por favor"
        );
      } else if (this.loan.prestacoes == null) {
        this.showToast(
          "Avizo!",
          "warning",
          "Seleccione o número de prestações por favor"
        );
      } else {
        this.customerLoanAmortization = loanSimulator(this.loan);
        // console.log(this.customerLoanAmortization);

        const installment = this.customerLoanAmortization[0].installment;

        const taxaReforco =
          parseFloat(this.currentCustomer.customerMonthlySalary) / 3;
        this.elegibility = installment <= taxaReforco ? true : false;

        this.maximumCapacity = taxaReforco;

        this.total2Pay = this.customerLoanAmortization.reduce(
          (sum, p) => sum + p.installment,
          0
        );
      }
    },

    cancelDeletion() {
      this.$refs["delete-document"].hide();
    },

    deleteDocument(document) {
      this.documentDeletionId = document.id;
      this.$refs["delete-document"].show();
    },

    decidedToDelete() {
      this.$store.commit("LOADING_STATUS", true);
      axios
        .delete(`/api/document/${this.documentDeletionId}`)
        .then((res) => {
          const data = res.data;
          if (data.success == true) {
            this.showToast("Sucesso!", "success", data.message);
            this.getDocuments();
          } else {
            this.showToast("Erro!", "danger", data.message);
          }
          this.$store.commit("LOADING_STATUS", false);
          this.$refs["delete-document"].hide();
        })
        .catch((err) => {
          this.showToast("Erro!", "danger", err.message);
          this.$store.commit("LOADING_STATUS", false);
        });
    },

    onFileChange(e) {
      this.selectedFile = e.target.files[0];
    },

    onUploadFile() {
      if (!this.selectedFile) {
        this.showToast(
          "Erro!",
          "warning",
          "Seleccione um documento por favor!"
        );
        return;
      }

      if (!this.form.documentName) {
        this.showToast(
          "Erro!",
          "warning",
          "Seleccione o tipo de documento por favor!"
        );
        return;
      }
      this.uploadCustomerDocument();
    },

    uploadCustomerDocument() {
      this.$store.commit("LOADING_STATUS", true);
      const formData = new FormData();
      formData.append("file", this.selectedFile);
      formData.append("companyId", String(this.company.id));
      formData.append("accountNumber", String(this.currentCustomer.accountNumber));
      formData.append("documentName", this.form.documentName);
      formData.append("uploadedBy", this.form.uploadedBy || this.user.name);
      axios
        .post(`/api/document`, formData)
        .then((res) => {
          const data = res.data;
          if (data.success == true) {
            this.showToast("Sucesso!", "success", data.message);
            this.uploadValue = 100;
            const logsParams = logs(
              this.user,
              `${this.form.documentName} carregado com sucesso.`,
              "Cadastro de documentos"
            );
            this.$store.dispatch("addLog", logsParams);

            this.getDocuments();
            this.selectedFile = "";
            this.form.documentName = null;
          } else {
            this.showToast("Erro!", "danger", data.message);
          }
          this.$store.commit("LOADING_STATUS", false);
          this.uploadValue = 0;
        })
        .catch((err) => {
          this.showToast("Erro!", "danger", err.message);
          this.$store.commit("LOADING_STATUS", false);
          this.uploadValue = 0;
        });
    },

    calculatePendingDays(dueDate) {
      const diffDays = this.today.diff(dueDate, "days");
      return diffDays;
    },

    formatDate(value) {
      if (!value) return "—";
      const date = moment(value);
      return date.isValid() ? date.format("DD/MM/YYYY") : "—";
    },

    showToast(title, variant, msg) {
      this.$bvToast.toast(`${msg}`, {
        title,
        variant,
        solid: true,
        toaster: "b-toaster-top-center",
        autoHideDelay: 5000,
      });
    },
  },
};
</script>
<style lang="scss" scoped>
@import "@/assets/scss/_variables";

// ==================== PAGE LAYOUT ====================
.page-content {
  padding: 20px 10px;
  overflow-y: auto;
  height: calc(100vh - 56px);
}

// ==================== CUSTOMER HEADER ====================
.customer-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-left: 4px solid $primary-color;

  .customer-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: rgba(69, 204, 184, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: $primary-color;
  }

  .customer-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
  }

  .salary-info {
    background-color: #f0f7f5;
    padding: 8px 16px;
    border-radius: 8px;
    text-align: center;

    .salary-value {
      font-size: 1rem;
      font-weight: 700;
      color: $primary-color;
      display: block;
    }
  }

  .elegibility-badge {
    font-size: 0.8rem;
    padding: 8px 14px;
    font-weight: 500;
  }
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

// ==================== SECTION CARDS ====================
.section-card {
  border: 1px solid #e8ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    background-color: #f8f9fa;
    border-bottom: 1px solid #e8ecef;
    font-weight: 600;
    font-size: 0.85rem;
    color: #495057;
    padding: 10px 16px;
    letter-spacing: 0.02em;
  }
}

// ==================== DOCUMENT UPLOAD ====================
.btn-upload {
  font-weight: 500;
  letter-spacing: 0.02em;
}

// ==================== DOCUMENT LIST ====================
.doc-item {
  padding: 8px 16px;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: #f8f9fa;
  }

  .doc-info {
    flex: 1;
    min-width: 0;

    .doc-name {
      font-weight: 500;
      color: #333;
    }
  }

  .doc-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
}

.borrower-doc-item {
  border-left: 3px solid rgba(69, 204, 184, 0.2);
}

.btn-doc-action {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50% !important;
}

// ==================== SIMULATION FORM ====================
.btn-simulate {
  font-weight: 600;
  padding: 6px 18px;
  letter-spacing: 0.02em;
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

// ==================== SUMMARY CARDS ====================
.summary-card {
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid transparent;

  .summary-label {
    display: block;
    color: #6c757d;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }

  .summary-value {
    font-size: 0.95rem;
    color: #212529;
  }
}

.summary-capital {
  background-color: #e8f5e9;
  border-left-color: #4caf50;
}

.summary-rate {
  background-color: #fff3e0;
  border-left-color: #ff9800;
}

.summary-installments {
  background-color: #e3f2fd;
  border-left-color: #2196f3;
}

.summary-total {
  background-color: #fce4ec;
  border-left-color: #e91e63;

  .summary-value {
    color: #c62828;
    font-weight: 700;
  }
}

// ==================== AMORTIZATION TABLE ====================
.amortization-table {
  font-size: 0.8rem;
  margin-bottom: 0;

  .table-header-row {
    background-color: #495057;
    color: #fff;

    th {
      font-weight: 600;
      font-size: 0.78rem;
      padding: 8px 12px;
      border: none;
      white-space: nowrap;
    }
  }

  .amortization-row {
    cursor: default;
    transition: background-color 0.1s ease;

    td {
      padding: 6px 12px;
      vertical-align: middle;
      border-color: #f0f0f0;
    }

    &:hover {
      background-color: #f5f8fa;
    }

    &:nth-child(even) {
      background-color: #fafbfc;

      &:hover {
        background-color: #f0f4f7;
      }
    }
  }
}

// ==================== SUBMISSION ====================
.btn-submit {
  font-weight: 600;
  padding: 6px 24px;
  letter-spacing: 0.02em;
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

@media (max-width: 991.98px) {
  .borrower-capacity-strip {
    grid-template-columns: 1fr;
  }
}
</style>
