<template>
  <div class="q-pa-md credits-page">
    <!-- ============ HEADER ============ -->
    <div class="row items-center q-mb-md no-wrap">
      <div class="col">
        <div class="text-h5 text-weight-bold">Créditos</div>
        <div class="text-caption text-grey-5">Pendentes, desembolsados, terminados e rejeitados</div>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn
          outline
          color="primary"
          icon="picture_as_pdf"
          label="Exportar PDF"
          no-caps
          rounded
          size="sm"
          :disable="filteredRows.length === 0"
          @click="exportPDF"
        />
        <q-btn
          outline
          color="teal"
          icon="table_chart"
          label="Exportar Excel"
          no-caps
          rounded
          size="sm"
          :disable="filteredRows.length === 0"
          @click="exportExcel"
        />
        <q-btn
          color="primary"
          icon="person_add"
          label="Conceder Crédito"
          unelevated
          rounded
          size="sm"
          no-caps
          @click="router.push('/mutuarios')"
        />
      </div>
    </div>

    <!-- ============ FILTROS ============ -->
    <q-card flat bordered class="q-mb-md filters-card" style="border-radius: 12px">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-md-4">
            <q-input
              v-model="search"
              dense
              outlined
              placeholder="Pesquisar por nome, conta ou telefone..."
              clearable
              @clear="resetPage"
              @keyup.enter="resetPage"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" />
              </template>
            </q-input>
          </div>
          <div class="col-6 col-md-2">
            <q-input v-model="dateFrom" dense outlined label="Data início" type="date" input-style="font-size: 12px" @update:model-value="resetPage" />
          </div>
          <div class="col-6 col-md-2">
            <q-input v-model="dateTo" dense outlined label="Data fim" type="date" input-style="font-size: 12px" @update:model-value="resetPage" />
          </div>
          <div class="col-6 col-md-2">
            <q-select
              v-model="managerFilter"
              dense
              outlined
              label="Gestor de crédito"
              clearable
              emit-value
              map-options
              :options="managerOptions"
              @update:model-value="resetPage"
            />
          </div>
          <div class="col-6 col-md-2 text-right">
            <q-btn flat round dense icon="filter_list_off" color="grey" size="sm" @click="clearFilters">
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="refresh" color="primary" size="sm" :loading="loading" @click="fetchLoans">
              <q-tooltip>Actualizar</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <!-- Segmentos -->
      <q-tabs
        v-model="tab"
        class="q-px-sm"
        align="left"
        dense
        inline-label
        active-color="primary"
        indicator-color="primary"
        @update:model-value="resetPage"
      >
        <q-tab
          v-for="seg in segments"
          :key="seg.key"
          :name="seg.key"
          :icon="seg.icon"
          no-caps
        >
          {{ seg.label }}
          <q-badge
            :color="seg.key === tab ? 'primary' : 'grey-5'"
            rounded
            class="q-ml-xs"
            :label="counts[seg.key]"
          />
        </q-tab>
      </q-tabs>
    </q-card>

    <!-- ============ RESUMO DO SEGMENTO ============ -->
    <div v-if="!loading && filteredRows.length > 0" class="row q-col-gutter-sm q-mb-md">
      <div v-for="stat in segmentStats" :key="stat.label" class="col-6 col-sm-3">
        <q-card flat bordered class="stat-card" :class="stat.tone || ''">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-6">{{ stat.label }}</div>
            <div class="text-subtitle1 text-weight-bold">{{ stat.money ? moneyRaw(stat.value) : stat.value }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ============ CARREGAMENTO / VAZIO / TABELA ============ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar créditos...</div>
    </div>

    <q-card v-else flat bordered class="table-card" style="border-radius: 12px; overflow: hidden">
      <!-- Empty state -->
      <q-card-section v-if="filteredRows.length === 0" class="text-center q-pa-xl">
        <q-icon name="account_balance_wallet" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Nenhum crédito {{ segment.single.toLowerCase() }}</div>
        <div class="text-caption text-grey-5 q-mb-md">
          {{ isFiltering ? 'Ajuste os filtros para ver mais resultados.' : `Não existem créditos ${segment.label.toLowerCase()} para esta empresa.` }}
        </div>
      </q-card-section>

      <!-- Tabela -->
      <q-table
        v-else
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        bordered
        dense
        separator="horizontal"
        :rows-per-page-options="[15, 25, 50, 100]"
        v-model:pagination="pagination"
        class="credits-table"
      >
        <!-- Mutuário -->
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar
                :color="getAvatarColor(props.row.customerName)"
                text-color="white"
                size="32px"
                class="q-mr-sm"
              >
                {{ getInitials(props.row.customerName) || '?' }}
              </q-avatar>
              <div class="no-wrap">
                <div class="row items-center no-wrap">
                  <div class="text-weight-medium" style="font-size: 13px">{{ props.row.customerName }}</div>
                  <q-badge
                    v-if="Number(props.row.isSelfRegistered) === 1"
                    color="teal"
                    outline
                    rounded
                    class="q-ml-xs"
                    style="font-size: 9px"
                  >
                    Auto-cadastro
                  </q-badge>
                </div>
                <div class="text-caption text-grey-6" style="font-size: 11px">
                  Conta {{ props.row.accountNumber }}<template v-if="props.row.customerPhone"> · {{ props.row.customerPhone }}</template>
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Valor / moeda -->
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-right">
            <span class="text-weight-bold" style="font-size: 13px">{{ formatMoney(props.row.amount) }}</span>
          </q-td>
        </template>
        <template v-slot:body-cell-totalPaid="props">
          <q-td :props="props" class="text-right">
            <span class="text-positive text-weight-medium" style="font-size: 13px">{{ formatMoney(props.row.totalPaid) }}</span>
          </q-td>
        </template>
        <template v-slot:body-cell-totalLateInterestPaid="props">
          <q-td :props="props" class="text-right">
            <span :class="props.row.totalLateInterestPaid > 0 ? 'text-orange-9 text-weight-medium' : 'text-grey-6'" style="font-size: 13px">
              {{ formatMoney(props.row.totalLateInterestPaid) }}
            </span>
          </q-td>
        </template>
        <template v-slot:body-cell-totalDiscount="props">
          <q-td :props="props" class="text-right">
            <span v-if="props.row.totalDiscount > 0" class="text-teal text-weight-medium" style="font-size: 13px">
              −{{ formatMoney(props.row.totalDiscount) }}
            </span>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <!-- Taxa -->
        <template v-slot:body-cell-rate="props">
          <q-td :props="props" class="text-center">
            <span v-if="Number(props.row.interestRate) > 0" class="text-weight-medium">{{ formatInterestRate(props.row.interestRate) }}</span>
            <span v-else class="text-grey-5">A definir</span>
          </q-td>
        </template>

        <!-- Período -->
        <template v-slot:body-cell-installments="props">
          <q-td :props="props" class="text-center">
            <span class="text-weight-medium">{{ props.row.numberOfInstallments }} <span class="text-caption text-grey-6">meses</span></span>
          </q-td>
        </template>

        <!-- Data de solicitação -->
        <template v-slot:body-cell-date="props">
          <q-td :props="props" class="text-center">
            <div style="font-size: 12px">{{ formatDateShort(props.row.dateCreated) || '—' }}</div>
          </q-td>
        </template>

        <!-- Data de desembolso -->
        <template v-slot:body-cell-disbursement="props">
          <q-td :props="props" class="text-center">
            <div style="font-size: 12px">{{ formatDateShort(props.row.disbursementDate) || '—' }}</div>
          </q-td>
        </template>

        <!-- Vencimento: data da última prestação -->
        <template v-slot:body-cell-due="props">
          <q-td :props="props" class="text-center">
            <div>
              <span :class="props.row.hasOverdue ? 'text-weight-bold text-negative' : 'text-weight-medium'" style="font-size: 12px">
                {{ formatDateShort(props.row.finalDueDate) || '—' }}
              </span>
            </div>
            <div v-if="props.row.hasOverdue" class="text-caption" style="font-size: 10px">
              <q-badge color="negative" rounded>{{ props.row.overdueCount }} em atraso</q-badge>
            </div>
          </q-td>
        </template>

        <!-- Ações: o olho abre sempre o painel do mutuário (não há página de detalhe/amortização do crédito) -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <div class="row items-center no-wrap justify-center" style="gap: 2px">
              <!-- Rejeitados: reabrir (re-submeter) + painel do mutuário + eliminar -->
              <template v-if="segment.key === 'rejected'">
                <q-btn
                  flat round dense icon="restart_alt" color="teal" size="xs"
                  @click.stop="confirmReopen(props.row)"
                >
                  <q-tooltip>Reabrir pedido (editar e re-submeter)</q-tooltip>
                </q-btn>
                <q-btn
                  flat round dense icon="visibility" color="primary" size="xs"
                  @click.stop="goToCustomer(props.row.accountNumber)"
                >
                  <q-tooltip>Abrir painel do mutuário</q-tooltip>
                </q-btn>
                <q-btn
                  flat round dense icon="delete" color="negative" size="xs"
                  @click.stop="confirmDelete(props.row)"
                >
                  <q-tooltip>Eliminar pedido</q-tooltip>
                </q-btn>
              </template>

              <!-- Pendentes: revisão de documentos + painel do mutuário + eliminar -->
              <template v-else-if="segment.key === 'pending'">
                <q-btn
                  flat round dense icon="fact_check" color="teal" size="xs"
                  @click.stop="openReview(props.row)"
                >
                  <q-tooltip>Revisar documentos e aprovar</q-tooltip>
                </q-btn>
                <q-btn
                  flat round dense icon="visibility" color="primary" size="xs"
                  @click.stop="goToCustomer(props.row.accountNumber)"
                >
                  <q-tooltip>Abrir painel do mutuário</q-tooltip>
                </q-btn>
                <q-btn
                  flat round dense icon="delete" color="negative" size="xs"
                  @click.stop="confirmDelete(props.row)"
                >
                  <q-tooltip>Eliminar pedido</q-tooltip>
                </q-btn>
              </template>

              <!-- Desembolsados / Terminados: apenas o olho → painel do mutuário -->
              <template v-else>
                <q-btn
                  flat round dense icon="visibility" color="primary" size="xs"
                  @click.stop="goToCustomer(props.row.accountNumber)"
                >
                  <q-tooltip>Abrir painel do mutuário</q-tooltip>
                </q-btn>
              </template>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Eliminar pedido -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 320px">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="warning" color="negative" text-color="white" size="40px" />
          <div class="q-ml-md">
            <div class="text-h6">Eliminar Crédito</div>
            <div class="text-caption text-grey-6">Esta acção não pode ser desfeita.</div>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="text-body2">
            Tem certeza que deseja eliminar o crédito da conta
            <strong>{{ deletingLoan?.accountNumber }}</strong>?
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated label="Eliminar" color="negative" :loading="deleting" @click="deleteLoanConfirmed" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Revisão de documentos do auto-cadastro (tab Pendentes) -->
    <q-dialog v-model="showReview" persistent>
      <q-card style="border-radius: 12px; width: 100%; max-width: 480px; min-width: 0">
        <q-card-section class="row items-center bg-primary text-white" style="border-radius: 12px 12px 0 0">
          <q-icon name="fact_check" size="22px" class="q-mr-sm" />
          <div class="col" style="min-width: 0">
            <div class="text-h6">Revisão de Documentos</div>
            <div class="text-caption" style="opacity: 0.85; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
              {{ reviewLoan?.customerName || '—' }} · Conta {{ reviewLoan?.accountNumber || '—' }}
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="showReview = false" />
        </q-card-section>

        <q-card-section class="q-pa-md" style="max-height: 62vh; overflow-y: auto">
          <!-- Fotografia tipo passe -->
          <div class="text-subtitle2 text-grey-7 q-mb-xs">
            <q-icon name="camera_alt" size="16px" class="q-mr-xs" />
            Fotografia tipo passe
          </div>
          <div class="photo-placeholder text-center q-pa-sm" style="border-radius: 8px">
            <img
              v-if="reviewLoan?.customerPassportPhoto"
              :src="reviewLoan.customerPassportPhoto"
              alt="Foto tipo passe"
              style="max-height: 170px; border-radius: 8px; max-width: 100%"
            />
            <div v-else class="text-caption text-grey-6 q-py-md">
              <q-icon name="no_photography" size="30px" class="block q-mx-auto q-mb-xs" />
              Sem fotografia submetida
            </div>
          </div>

          <!-- Documentos -->
          <div class="text-subtitle2 text-grey-7 q-mb-xs q-mt-md">
            <q-icon name="folder_open" size="16px" class="q-mr-xs" />
            Documentos submetidos
          </div>
          <q-banner v-if="!reviewLoan?.customerDocuments?.length" class="bg-orange-1 text-orange-9 q-mb-sm" rounded dense>
            <template v-slot:avatar>
              <q-icon name="warning" color="orange" size="18px" />
            </template>
            O mutuário ainda não submeteu documentos. O crédito pode ser aprovado, mas recomendamos solicitar os documentos antes do desembolso.
          </q-banner>
          <q-list v-if="reviewLoan?.customerDocuments?.length" separator bordered rounded>
            <q-item v-for="(doc, i) in reviewLoan.customerDocuments" :key="i">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" icon="description" size="34px" />
              </q-item-section>
              <q-item-section>
                <q-item-label style="font-size: 13px">{{ doc.documentName }}</q-item-label>
                <q-item-label caption style="font-size: 11px">{{ doc.documentFileUrl }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat round dense icon="open_in_new" color="primary" size="sm" @click="openDoc(doc)">
                  <q-tooltip>Ver documento</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Resumo do pedido -->
          <div class="text-subtitle2 text-grey-7 q-mb-xs q-mt-md">
            <q-icon name="request_quote" size="16px" class="q-mr-xs" />
            Pedido de crédito
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-5">Montante solicitado</div>
              <div class="text-weight-bold text-primary" style="font-size: 15px">{{ formatMoney(reviewLoan?.amount) }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Prazo</div>
              <div class="text-weight-bold" style="font-size: 15px">
                {{ reviewLoan?.numberOfInstallments }} {{ reviewLoan?.numberOfInstallments === 1 ? 'mês' : 'meses' }}
              </div>
            </div>
            <div class="col-12" v-if="reviewLoan?.loanDescription">
              <div class="text-caption text-grey-5">Finalidade</div>
              <div class="text-body2">{{ reviewLoan.loanDescription }}</div>
            </div>
          </div>

          <!-- Capacidade de pagamento (1/3 do rendimento) -->
          <div class="text-subtitle2 text-grey-7 q-mb-xs q-mt-md">
            <q-icon name="speed" size="16px" class="q-mr-xs" />
            Capacidade de pagamento
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-4">
              <div class="text-caption text-grey-5" style="font-size: 10px">Rendimento mensal</div>
              <div class="text-weight-bold" style="font-size: 13px">{{ formatMoney(reviewCapacity.salary) }}</div>
            </div>
            <div class="col-4">
              <div class="text-caption text-grey-5" style="font-size: 10px">Capacidade (1/3)</div>
              <div class="text-weight-bold text-positive" style="font-size: 13px">{{ formatMoney(reviewCapacity.maxCapacity) }}</div>
            </div>
            <div class="col-4">
              <div class="text-caption text-grey-5" style="font-size: 10px">Prestação estimada</div>
              <div class="text-weight-bold" :class="reviewCapacity.isExceeded ? 'text-negative' : 'text-grey-8'" style="font-size: 13px">
                {{ reviewCapacity.hasRate ? formatMoney(reviewCapacity.estimatedInstallment) : 'A definir' }}
              </div>
            </div>
          </div>
          <div v-if="reviewCapacity.isExceeded" class="text-caption text-negative q-mt-xs">
            <q-icon name="warning" size="13px" class="q-mr-xs" />
            A prestação estimada excede 1/3 do rendimento — registe um parecer na aprovação ou rejeite.
          </div>
          <div v-else-if="reviewCapacity.computable && reviewCapacity.hasRate" class="text-caption text-positive q-mt-xs">
            <q-icon name="check_circle" size="13px" class="q-mr-xs" />
            Dentro da capacidade de pagamento.
          </div>
          <div v-else-if="!reviewCapacity.computable" class="text-caption text-grey-5 q-mt-xs">
            Sem rendimento registado — verifique os dados do mutuário.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            outline
            label="Solicitar documentos"
            color="blue"
            icon="sms"
            no-caps
            rounded
            :disable="!reviewLoan?.customerPhone"
            @click="openDocumentRequestSms"
          >
            <q-tooltip v-if="!reviewLoan?.customerPhone">Mutuário sem telefone registado</q-tooltip>
          </q-btn>
          <q-btn outline label="Rejeitar" color="negative" icon="cancel" no-caps rounded @click="openReject" />
          <q-btn
            unelevated
            label="Aprovar Crédito"
            color="positive"
            icon="check_circle"
            no-caps
            rounded
            @click="openApprovalFromReview"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Rejeição com parecer (tab Pendentes) -->
    <q-dialog v-model="showRejectDialog" persistent>
      <q-card style="border-radius: 12px; min-width: 380px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="cancel" color="negative" text-color="white" size="40px" />
          <div class="q-ml-md">
            <div class="text-h6">Rejeitar Crédito</div>
            <div class="text-caption text-grey-6">
              {{ reviewLoan?.customerName || '—' }} · {{ formatMoney(reviewLoan?.amount) }}
            </div>
          </div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="rejectOpinion"
            label="Parecer / Motivo da rejeição"
            dense
            outlined
            type="textarea"
            rows="3"
            class="q-mb-sm"
            :maxlength="500"
          />
          <div class="text-caption text-grey-6">O parecer fica registado no pedido e no histórico do sistema.</div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps v-close-popup />
          <q-btn unelevated label="Rejeitar Crédito" color="negative" icon="cancel" no-caps rounded :loading="rejecting" @click="confirmReject" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Aprovação (reutiliza o modal de aprovação do painel do mutuário) -->
    <LoanApprovalModal v-model="showApproval" :loan="approvalLoan" @approved="onLoanApproved" />

    <!-- SMS pré-preenchido para solicitar documentos em falta -->
    <SendMessageModal
      v-model="showDocumentRequestSms"
      :phone="reviewLoan?.customerPhone || ''"
      :account-number="reviewLoan?.accountNumber || ''"
      :customer-name="reviewLoan?.customerName || ''"
      channel="sms"
      message-type="document_request"
      :initial-message="documentRequestMessage"
      @sent="onDocumentRequestSent"
    />

    <!-- Reabrir pedido rejeitado (editar valor/taxa/prazo antes de re-submeter) -->
    <q-dialog v-model="showReopenConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 460px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="restart_alt" color="teal" text-color="white" size="40px" />
          <div class="q-ml-md">
            <div class="text-h6">Reabrir pedido</div>
            <div class="text-caption text-grey-6">Edite os dados se necessário — o crédito volta para Pendentes</div>
          </div>
        </q-card-section>

        <q-card-section>
          <div class="row items-center no-wrap q-mb-sm">
            <q-avatar size="24px" color="primary" text-color="white" style="font-size: 10px">
              {{ getInitials(reopeningLoan?.customerName) || '?' }}
            </q-avatar>
            <div class="q-ml-sm" style="font-size: 13px">
              <strong>{{ reopeningLoan?.customerName || '—' }}</strong>
              <span v-if="reopeningLoan" class="text-grey-6 text-caption"> · Conta {{ reopeningLoan.accountNumber }}</span>
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model="reopenForm.amount"
                label="Valor solicitado (MZN) *"
                type="number"
                dense
                outlined
                min="1"
              >
                <template v-slot:prepend>
                  <q-icon name="attach_money" size="18px" />
                </template>
              </q-input>
            </div>
            <div class="col-6">
              <q-input
                v-model="reopenForm.months"
                label="Prazo (meses) *"
                type="number"
                dense
                outlined
                min="1"
                step="1"
              >
                <template v-slot:prepend>
                  <q-icon name="calendar_month" size="18px" />
                </template>
              </q-input>
            </div>
            <div class="col-12">
              <q-select
                v-model="reopenForm.rateId"
                :options="reopenRateOptions"
                label="Plano / taxa de juro *"
                dense
                outlined
                emit-value
                map-options
                options-dense
                :loading="loadingRates"
                :disable="loadingRates"
              >
                <template v-slot:prepend>
                  <q-icon name="percent" size="18px" />
                </template>
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey-5">Sem planos configurados</q-item-section>
                  </q-item>
                </template>
              </q-select>
              <div
                v-if="!loadingRates && reopenRateOptions.length === 0"
                class="text-caption text-warning q-mt-xs"
              >
                Não existem planos de taxa configurados para a empresa — registe em Configurações antes de reabrir.
              </div>
            </div>
          </div>

          <!-- Análise de capacidade de pagamento (1/3 do rendimento mensal) -->
          <div
            v-if="reopenAnalysis.computable"
            class="q-mt-sm capacity-box"
            :class="reopenAnalysis.isExceeded ? 'capacity-box--bad' : 'capacity-box--ok'"
          >
            <div class="row items-center q-col-gutter-sm no-wrap">
              <div class="col-auto">
                <q-icon
                  :name="reopenAnalysis.isExceeded ? 'error' : 'verified_user'"
                  :color="reopenAnalysis.isExceeded ? 'negative' : 'positive'"
                  size="24px"
                />
              </div>
              <div class="col" style="font-size: 12px; line-height: 1.5">
                <div>
                  Rendimento mensal:
                  <strong>{{ reopenAnalysis.salary > 0 ? formatMoney(reopenAnalysis.salary) : 'não registado' }}</strong>
                  <template v-if="reopenAnalysis.salary > 0">
                    · limite 1/3: <strong>{{ formatMoney(reopenAnalysis.maxCapacity) }}</strong>
                  </template>
                </div>
                <div v-if="!reopenAnalysis.isExceeded" class="text-positive">
                  Prestação estimada <strong>{{ formatMoney(reopenAnalysis.estimatedInstallment) }}</strong>
                  — dentro do limite de 1/3 do rendimento.
                </div>
                <div v-else class="text-negative text-weight-medium">
                  Prestação estimada <strong>{{ formatMoney(reopenAnalysis.estimatedInstallment) }}</strong>
                  excede 1/3 do rendimento — registe um parecer para poder reabrir.
                </div>
              </div>
            </div>

            <q-input
              v-if="reopenAnalysis.isExceeded"
              v-model="reopenForm.observation"
              class="q-mt-sm"
              type="textarea"
              dense
              outlined
              autogrow
              label="Parecer / observação *"
              placeholder="Justifique a excepção à regra de 1/3 do rendimento (mín. 10 caracteres)"
              :error="reopenAnalysis.isExceeded && reopenObservationShort"
              error-message="O parecer deve ter pelo menos 10 caracteres."
            />
          </div>

          <div class="text-caption text-grey-5 q-mt-sm" style="line-height: 1.5">
            Ao reabrir, o pedido volta a <strong>Pendentes</strong> com estes valores para nova análise e aprovação.
            <template v-if="reopenAnalysis.computable && reopenAnalysis.isExceeded">
              O parecer fica registado no crédito e é enviado aos administradores e ao gestor.
            </template>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" :disable="reopening" v-close-popup />
          <q-btn
            unelevated
            label="Reabrir pedido"
            color="teal"
            icon="restart_alt"
            :loading="reopening"
            :disable="reopening || reopenBlocked"
            @click="reopenConfirmed"
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
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'
import { formatMoney, formatDateShort, formatInterestRate, getInitials } from '@/utils/formatters'
import { logReopenLoan, logApproveLoan, logRejectLoan, logSendSms } from '@/utils/logger'
import LoanApprovalModal from '@/components/modals/LoanApprovalModal.vue'
import SendMessageModal from '@/components/modals/SendMessageModal.vue'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const segments = [
  { key: 'pending', statuses: [0], label: 'Pendentes', single: 'Pendente', icon: 'hourglass_top' },
  { key: 'active', statuses: [1], label: 'Desembolsados', single: 'Desembolsado', icon: 'trending_up' },
  { key: 'completed', statuses: [3], label: 'Terminados', single: 'Terminado', icon: 'task_alt' },
  { key: 'rejected', statuses: [2, -1], label: 'Rejeitados', single: 'Rejeitado', icon: 'block' }
]

const tab = ref('active')
const segment = computed(() => segments.find(s => s.key === tab.value) || segments[0])

// ─── Dados ───
const loading = ref(false)
const allLoans = ref([])

// ─── Filtros ───
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const managerFilter = ref(null)
const managers = ref([])

// ─── Paginação / exportação ───
const pagination = ref({ sortBy: 'dateCreated', descending: true, page: 1, rowsPerPage: 15, rowsNumber: 0 })

// ─── Eliminar ───
const showDeleteConfirm = ref(false)
const deletingLoan = ref(null)
const deleting = ref(false)

// ─── Revisão de documentos / aprovação (tab Pendentes) ───
const showReview = ref(false)
const reviewLoan = ref(null)
const showApproval = ref(false)
const approvalLoan = ref(null)
const showDocumentRequestSms = ref(false)
const showRejectDialog = ref(false)
const rejectOpinion = ref('')
const rejecting = ref(false)

function openReview(row) {
  reviewLoan.value = row
  showReview.value = true
}

function openDoc(doc) {
  if (doc?.documentFileUrl) window.open(doc.documentFileUrl, '_blank')
}

const documentRequestMessage = computed(() => {
  const name = reviewLoan.value?.customerName || 'Cliente'
  return `Ola ${name}. Para concluir o seu pedido de credito, envie BI/Passaporte, NUIT e Declaracao de Bairro. Pode submete-los depois. Obrigado.`
})

function openDocumentRequestSms() {
  if (!reviewLoan.value?.customerPhone) {
    $q.notify({ type: 'warning', message: 'O mutuário não tem telefone registado.', position: 'top' })
    return
  }
  showDocumentRequestSms.value = true
}

async function onDocumentRequestSent() {
  const loan = reviewLoan.value
  await logSendSms(loan?.customerName || `Conta ${loan?.accountNumber}`, documentRequestMessage.value)
}

// Capacidade de pagamento (1/3 do rendimento) no painel de revisão — usa a
// mesma fórmula do backend (sistema francês / Price) e a taxa já definida no
// pedido (créditos reabertos). Na aprovação, o modal recalcula com a taxa real.
const reviewCapacity = computed(() => {
  const loan = reviewLoan.value
  if (!loan) return { computable: false, salary: 0, maxCapacity: 0, hasRate: false, estimatedInstallment: 0, isExceeded: false }
  const salary = Number(loan.customerMonthlySalary) || 0
  const maxCapacity = salary / 3
  const rate = Number(loan.interestRate) || 0
  const principal = Number(loan.amount) || 0
  const periods = Number(loan.numberOfInstallments) || 0
  let estimatedInstallment = 0
  if (principal > 0 && periods > 0) {
    estimatedInstallment = capacityInstallment(principal, rate, periods)
  }
  return {
    computable: salary > 0,
    salary,
    maxCapacity,
    hasRate: rate > 0,
    estimatedInstallment,
    isExceeded: estimatedInstallment > 0 && estimatedInstallment > maxCapacity
  }
})

// Aprovar directamente da revisão, sem abrir o painel do mutuário
function openApprovalFromReview() {
  approvalLoan.value = reviewLoan.value
  showReview.value = false
  showApproval.value = true
}

function onLoanApproved() {
  // Regista no histórico quem aprovou e quando (mesmo log do painel do mutuário)
  logApproveLoan(reviewLoan.value?.customerName || `Conta ${reviewLoan.value?.accountNumber}`, reviewLoan.value?.amount)
  showApproval.value = false
  approvalLoan.value = null
  reviewLoan.value = null
  showReview.value = false
  fetchLoans()
}

// Rejeitar directamente da revisão, com parecer registado no pedido
function openReject() {
  rejectOpinion.value = ''
  showRejectDialog.value = true
}

async function confirmReject() {
  const loan = reviewLoan.value
  if (!loan) return
  rejecting.value = true
  try {
    const payload = { status: -1 }
    if (rejectOpinion.value && rejectOpinion.value.trim()) {
      payload.capacityExcessObservation = rejectOpinion.value.trim()
    }
    await api.put(`/api/loan/${loan.id}`, payload)
    // Regista no histórico quem rejeitou e quando
    await logRejectLoan(loan.customerName || `Conta ${loan.accountNumber}`, loan.amount)
    $q.notify({ type: 'warning', message: 'Crédito rejeitado', position: 'top' })
    showRejectDialog.value = false
    showReview.value = false
    reviewLoan.value = null
    fetchLoans()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao rejeitar crédito', position: 'top' })
  } finally {
    rejecting.value = false
  }
}

// ─── Reabrir pedido rejeitado ───
const showReopenConfirm = ref(false)
const reopeningLoan = ref(null)
const reopening = ref(false)
const reopenForm = ref({ amount: '', rateId: null, months: '', observation: '' })

// Planos de taxa de juro configurados para a empresa (GET /api/rate/:companyId)
const rateList = ref([])
const loadingRates = ref(false)

function formatTaxPct(tax) {
  const pct = Number(tax) * 100
  return Number(pct.toFixed(3)).toLocaleString('pt-MZ', { maximumFractionDigits: 3 })
}

const reopenRateOptions = computed(() =>
  rateList.value.map(r => ({
    label: `${r.name || 'Plano'} — ${formatTaxPct(Number(r.tax))}% a.m.`,
    value: r.id
  }))
)

function selectedRate() {
  return rateList.value.find(r => Number(r.id) === Number(reopenForm.value.rateId)) || null
}

async function fetchRates(companyId) {
  if (!companyId) return
  loadingRates.value = true
  try {
    const { data } = await api.get(`/api/rate/${companyId}`)
    rateList.value = (data?.success && Array.isArray(data.result)) ? data.result : []
  } catch (error) {
    console.error('Erro ao carregar planos de taxa:', error)
    rateList.value = []
  } finally {
    loadingRates.value = false
  }
}

// ==================== FETCH ====================
async function fetchLoans() {
  const companyId = authStore.companyId
  if (!companyId) return
  loading.value = true
  try {
    const { data } = await api.get(`/api/loans/overview/${companyId}`)
    allLoans.value = (data?.success && Array.isArray(data.result)) ? data.result : []
  } catch (error) {
    console.error('Erro ao carregar créditos:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar créditos', position: 'top' })
    allLoans.value = []
  } finally {
    loading.value = false
  }
}

async function loadManagers() {
  const companyId = authStore.companyId
  if (!companyId) return
  try {
    const { data } = await api.get(`/api/usersAll/${companyId}`)
    if (data?.success) {
      managers.value = (data.result || []).map(u => ({ label: u.name, value: u.id }))
    }
  } catch { /* silencioso — filtro de gestor fica indisponível */ }
}

// ==================== CONTAGENS / FILTRO ====================
const counts = computed(() => {
  const out = {}
  for (const seg of segments) {
    out[seg.key] = allLoans.value.filter(l => seg.statuses.includes(Number(l.status))).length
  }
  return out
})

const managerOptions = computed(() => managers.value)
const isFiltering = computed(() => !!search.value || !!dateFrom.value || !!dateTo.value || managerFilter.value !== null)

function normDate(v) {
  if (!v) return ''
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return m[0]
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(s)
  return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ''
}

function passesFilters(loan) {
  if (search.value) {
    const q = search.value.trim().toLowerCase()
    const haystack = [
      loan.customerName,
      String(loan.accountNumber || ''),
      loan.customerPhone,
      loan.loanDescription
    ].filter(Boolean).join(' ').toLowerCase()
    if (!haystack.includes(q)) return false
  }
  if (dateFrom.value || dateTo.value) {
    const d = normDate(loan.dateCreated)
    if (dateFrom.value && d && d < normDate(dateFrom.value)) return false
    if (dateTo.value && d && d > normDate(dateTo.value)) return false
  }
  if (managerFilter.value !== null && Number(loan.creditManager) !== Number(managerFilter.value)) return false
  return true
}

const filteredRows = computed(() =>
  allLoans.value
    .filter(l => segment.value.statuses.includes(Number(l.status)))
    .filter(passesFilters)
)

// Paginação: manter rowsNumber sincronizado com o conjunto filtrado (senão o
// rodapé mostra "1-0 of 0") e voltar à 1ª página se o filtro reduzir as linhas.
watch(filteredRows, (rows) => {
  const n = rows.length
  const rpp = pagination.value.rowsPerPage || 15
  const maxPage = Math.max(1, Math.ceil(n / rpp))
  pagination.value.rowsNumber = n
  if (pagination.value.page > maxPage) pagination.value.page = maxPage
})

// ==================== RESUMO ====================
const sumRows = (rows, field) => rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0)

const segmentStats = computed(() => {
  const rows = filteredRows.value
  if (segment.value.key === 'pending' || segment.value.key === 'rejected') {
    const isPending = segment.value.key === 'pending'
    return [
      { label: isPending ? 'Créditos pendentes' : 'Pedidos rejeitados', value: rows.length, money: false },
      { label: isPending ? 'Valor solicitado' : 'Valor não aprovado', value: sumRows(rows, 'amount'), money: true, tone: isPending ? '' : 'tone-red' },
      { label: 'Prestações (média)', value: rows.length ? (sumRows(rows, 'numberOfInstallments') / rows.length).toFixed(0) : '0', money: false },
      { label: 'Com taxa definida', value: rows.filter(r => Number(r.interestRate) > 0).length, money: false }
    ]
  }
  if (segment.value.key === 'completed') {
    return [
      { label: 'Créditos terminados', value: rows.length, money: false },
      { label: 'Total pago', value: sumRows(rows, 'totalPaid'), money: true, tone: 'tone-green' },
      { label: 'Juros de mora pagos', value: sumRows(rows, 'totalLateInterestPaid'), money: true },
      { label: 'Descontos concedidos', value: sumRows(rows, 'totalDiscount'), money: true, tone: 'tone-teal' }
    ]
  }
  // desembolsados
  const withRate = rows.filter(r => Number(r.interestRate) > 0)
  const avgRate = withRate.length
    ? `${((withRate.reduce((acc, r) => acc + Number(r.interestRate), 0) / withRate.length) * 100).toFixed(1).replace('.', ',')}%`
    : '—'
  return [
    { label: 'Créditos em curso', value: rows.length, money: false },
    { label: 'Valor de crédito', value: sumRows(rows, 'amount'), money: true },
    { label: 'Total em dívida', value: sumRows(rows, 'amountInDebt'), money: true, tone: 'tone-red' },
    { label: 'Taxa média', value: avgRate, money: false }
  ]
})

// ==================== COLUNAS ====================
const columns = computed(() => {
  if (segment.value.key === 'pending' || segment.value.key === 'rejected') {
    return [
      { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
      { name: 'date', label: 'Data', field: 'dateCreated', align: 'center', sortable: true },
      { name: 'amount', label: 'Valor solicitado', field: 'amount', align: 'right', sortable: true },
      { name: 'rate', label: 'Taxa de juro', field: 'interestRate', align: 'center', sortable: true },
      { name: 'installments', label: 'Prestações', field: 'numberOfInstallments', align: 'center', sortable: true },
      { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
    ]
  }
  if (segment.value.key === 'completed') {
    return [
      { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
      { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
      { name: 'rate', label: 'Taxa de juro', field: 'interestRate', align: 'center', sortable: true },
      { name: 'totalLateInterestPaid', label: 'Juros de mora', field: 'totalLateInterestPaid', align: 'right', sortable: true },
      { name: 'totalPaid', label: 'Total pago', field: 'totalPaid', align: 'right', sortable: true },
      { name: 'totalDiscount', label: 'Descontos', field: 'totalDiscount', align: 'right', sortable: true },
      { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
    ]
  }
  // desembolsados: valor de crédito após o mutuário; data de desembolso antes
  // do vencimento (data da última prestação)
  return [
    { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
    { name: 'amount', label: 'Valor de crédito', field: 'amount', align: 'right', sortable: true },
    { name: 'rate', label: 'Taxa aplicada', field: 'interestRate', align: 'center', sortable: true },
    { name: 'installments', label: 'Período', field: 'numberOfInstallments', align: 'center', sortable: true },
    { name: 'disbursement', label: 'Data de desembolso', field: 'disbursementDate', align: 'center', sortable: true },
    { name: 'due', label: 'Vencimento', field: 'finalDueDate', align: 'center', sortable: true },
    { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
  ]
})

// ==================== NAVEGAÇÃO / ACÇÕES ====================
function resetPage() {
  pagination.value = { ...pagination.value, page: 1 }
}

function clearFilters() {
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  managerFilter.value = null
  resetPage()
}

function goToCustomer(accountNumber) {
  router.push(`/mutuarios/${accountNumber}`)
}

// Cor do avatar por nome — mesma paleta/grelha da página de Mutuários
function getAvatarColor(name) {
  const colors = ['blue', 'green', 'teal', 'purple', 'orange', 'red', 'pink', 'cyan']
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function confirmDelete(row) {
  deletingLoan.value = row
  showDeleteConfirm.value = true
}

async function deleteLoanConfirmed() {
  deleting.value = true
  try {
    await api.delete(`/api/loan/${deletingLoan.value.id}`)
    $q.notify({ type: 'positive', message: 'Crédito eliminado com sucesso', position: 'top' })
    showDeleteConfirm.value = false
    await fetchLoans()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar crédito', position: 'top' })
  } finally {
    deleting.value = false
  }
}

function toNum(value) {
  const n = Number(String(value ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

async function confirmReopen(row) {
  reopeningLoan.value = row
  reopenForm.value = {
    amount: row.amount !== null && row.amount !== undefined ? String(Number(row.amount)) : '',
    rateId: null,
    months: row.numberOfInstallments !== null && row.numberOfInstallments !== undefined ? String(Number(row.numberOfInstallments)) : '',
    observation: row.capacityExcessObservation || ''
  }
  showReopenConfirm.value = true

  // Carregar os planos de taxa da empresa (uma vez) e pré-seleccionar o plano
  // cuja taxa corresponde à do pedido rejeitado, se existir.
  const companyId = row.companyId || authStore.companyId
  if (rateList.value.length === 0 && companyId) {
    await fetchRates(companyId)
  }
  const existing = Number(row.interestRate) || 0
  if (existing > 0) {
    const match = rateList.value.find(r => Math.abs(Number(r.tax) - existing) < 1e-6)
    if (match) reopenForm.value.rateId = match.id
  }
}

// Mesma fórmula do backend (sistema francês / Price) para a prestação estimada
function capacityInstallment(principal, rateFraction, periods) {
  const p = Number(principal) || 0
  const r = Number(rateFraction) || 0
  const n = Math.max(1, parseInt(String(periods), 10) || 1)
  if (p <= 0) return 0
  if (r <= 0) return p / n
  const numerator = r * Math.pow(1 + r, n)
  const denominator = Math.pow(1 + r, n) - 1
  return p * (numerator / denominator)
}

// Análise ao vivo da capacidade de pagamento (1/3 do rendimento mensal), com a
// mesma regra validada no backend ao reabrir (ver validateCapacityRule).
const reopenAnalysis = computed(() => {
  const loan = reopeningLoan.value
  const amount = toNum(reopenForm.value.amount)
  const selected = selectedRate()
  const ratePct = selected ? Number(selected.tax) * 100 : NaN
  const months = parseInt(String(reopenForm.value.months || '').trim(), 10)
  const computable = !!(
    loan &&
    amount > 0 &&
    Number.isFinite(ratePct) &&
    ratePct >= 0 &&
    Number.isInteger(months) &&
    months >= 1
  )
  if (!computable) return { computable: false }
  const salary = Number(loan.customerMonthlySalary) || 0
  const maxCapacity = salary / 3
  const estimatedInstallment = capacityInstallment(amount, ratePct / 100, months)
  return {
    computable: true,
    salary,
    maxCapacity,
    estimatedInstallment,
    isExceeded: estimatedInstallment > maxCapacity
  }
})

const reopenObservationShort = computed(() =>
  String(reopenForm.value.observation || '').trim().length < 10
)

const reopenBlocked = computed(() =>
  reopenForm.value.rateId === null ||
  reopenForm.value.rateId === undefined ||
  (reopenAnalysis.value.computable &&
    reopenAnalysis.value.isExceeded &&
    reopenObservationShort.value)
)

// Re-submeter um pedido rejeitado: edita valor/taxa/prazo e volta a Pendentes (0)
async function reopenConfirmed() {
  const loan = reopeningLoan.value
  if (!loan) return

  const amount = toNum(reopenForm.value.amount)
  const months = parseInt(String(reopenForm.value.months).trim(), 10)

  if (!(amount > 0)) {
    $q.notify({ type: 'warning', message: 'Indique o valor solicitado do crédito', position: 'top' })
    return
  }
  if (!Number.isInteger(months) || months < 1) {
    $q.notify({ type: 'warning', message: 'Indique o prazo em meses', position: 'top' })
    return
  }
  const plan = selectedRate()
  if (!plan) {
    $q.notify({ type: 'warning', message: 'Seleccione o plano / taxa de juro a aplicar', position: 'top' })
    return
  }
  if (reopenAnalysis.value.isExceeded && reopenObservationShort.value) {
    $q.notify({ type: 'warning', message: 'Registe um parecer (mín. 10 caracteres) para reabrir fora da regra de 1/3', position: 'top' })
    return
  }

  const payload = {
    status: 0,
    amount,
    interestRate: Math.round(Number(plan.tax) * 1e6) / 1e6,
    numberOfInstallments: months
  }
  if (reopenAnalysis.value.isExceeded) {
    payload.capacityExcessObservation = reopenForm.value.observation.trim()
  }

  reopening.value = true
  try {
    await api.put(`/api/loan/${loan.id}`, payload)
    // Regista no histórico do sistema quem reabriu e quando
    await logReopenLoan(loan.customerName || `Conta ${loan.accountNumber}`, amount, loan.accountNumber)
    $q.notify({
      type: 'positive',
      message: 'Pedido reaberto — está novamente em Pendentes para nova análise.',
      position: 'top'
    })
    showReopenConfirm.value = false
    await fetchLoans()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao reabrir o pedido', position: 'top' })
  } finally {
    reopening.value = false
  }
}

// ==================== EXPORTAÇÃO ====================
function moneyRaw(value) {
  return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function pctLabel(loan) {
  return Number(loan.interestRate) > 0 ? formatInterestRate(loan.interestRate) : '—'
}

function dateLabel(value) {
  return value ? (formatDateShort(value) || '—') : '—'
}

// Conteúdo exportado (uma linha = um crédito), ordenado como a grelha actual
function exportRows() {
  return filteredRows.value.map(loan => {
    const row = {
      customerName: loan.customerName || '—',
      accountNumber: String(loan.accountNumber ?? '—'),
      phone: loan.customerPhone || '—',
      date: dateLabel(loan.dateCreated)
    }
    if (segment.value.key === 'pending' || segment.value.key === 'rejected') {
      row.amount = Number(loan.amount) || 0
      row.rate = pctLabel(loan)
      row.installments = Number(loan.numberOfInstallments) || 0
      row.status = segment.value.key === 'rejected' ? 'Rejeitado' : 'Pendente'
    } else if (segment.value.key === 'completed') {
      row.amount = Number(loan.amount) || 0
      row.rate = pctLabel(loan)
      row.lateInterest = Number(loan.totalLateInterestPaid) || 0
      row.totalPaid = Number(loan.totalPaid) || 0
      row.discount = Number(loan.totalDiscount) || 0
    } else {
      // desembolsados
      row.amount = Number(loan.amount) || 0
      row.rate = pctLabel(loan)
      row.period = Number(loan.numberOfInstallments) || 0
      row.disbursement = dateLabel(loan.disbursementDate)
      row.finalDue = dateLabel(loan.finalDueDate)
    }
    return row
  })
}

function exportConfig() {
  if (segment.value.key === 'pending' || segment.value.key === 'rejected') {
    const rejected = segment.value.key === 'rejected'
    return {
      sheet: rejected ? 'Rejeitados' : 'Pendentes',
      headers: ['Mutuário', 'Conta', 'Telefone', 'Data', 'Valor solicitado (MZN)', 'Taxa de juro', 'Prestações', 'Estado'],
      keys: ['customerName', 'accountNumber', 'phone', 'date', 'amount', 'rate', 'installments', 'status'],
      align: ['left', 'center', 'center', 'center', 'right', 'center', 'center', 'center'],
      money: [false, false, false, false, true, false, false, false],
      widths: [150, 55, 75, 60, 80, 55, 55, 55]
    }
  }
  if (segment.value.key === 'completed') {
    return {
      sheet: 'Terminados',
      headers: ['Mutuário', 'Conta', 'Telefone', 'Valor (MZN)', 'Taxa de juro', 'Juros de mora (MZN)', 'Total pago (MZN)', 'Descontos (MZN)'],
      keys: ['customerName', 'accountNumber', 'phone', 'amount', 'rate', 'lateInterest', 'totalPaid', 'discount'],
      align: ['left', 'center', 'center', 'right', 'center', 'right', 'right', 'right'],
      money: [false, false, false, true, false, true, true, true],
      widths: [150, 55, 75, 70, 55, 75, 75, 75]
    }
  }
  // desembolsados
  return {
    sheet: 'Desembolsados',
    headers: ['Mutuário', 'Conta', 'Telefone', 'Valor de crédito (MZN)', 'Taxa aplicada', 'Período (meses)', 'Data de desembolso', 'Vencimento (última prestação)'],
    keys: ['customerName', 'accountNumber', 'phone', 'amount', 'rate', 'period', 'disbursement', 'finalDue'],
    align: ['left', 'center', 'center', 'right', 'center', 'center', 'center', 'center'],
    money: [false, false, false, true, false, false, false, false],
    widths: [150, 55, 75, 80, 55, 65, 75, 85]
  }
}

async function exportPDF() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há créditos para exportar', position: 'top' })
    return
  }
  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const { buildCompanyHeader, companyLogoBase64 } = await import('@/utils/pdfHeader')
    const cfg = exportConfig()
    const title = `Créditos ${segment.value.label}`
    const company = companyStore.company || {}
    // O pdfmake não renderiza URLs — o logo tem de vir em base64 (ver companyLogoBase64)
    const logoBase64 = await companyLogoBase64(company)

    const body = [
      cfg.headers.map(h => ({ text: h, style: 'tableHeader' })),
      ...rows.map(row => cfg.keys.map((k, i) => ({
        text: cfg.money[i] ? moneyRaw(row[k]) : String(row[k] ?? '—'),
        style: cfg.money[i] ? 'cellRight' : (cfg.align[i] === 'center' ? 'cellCenter' : 'cellText')
      })))
    ]

    // Linha de totais (colunas monetárias)
    const totalRow = cfg.keys.map((k, i) => {
      if (!cfg.money[i]) return { text: i === 0 ? 'TOTAL' : '', style: 'totalCell' }
      const sum = rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)
      return { text: moneyRaw(sum), style: 'totalCellRight' }
    })
    body.push(totalRow)

    const dateStr = new Date().toISOString().slice(0, 10)
    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [24, 20, 24, 30],
      content: [
        ...buildCompanyHeader(company, logoBase64, `${title} — ${dateStr}`),
        {
          text: rows.length > 1 ? `${rows.length} créditos` : '1 crédito',
          fontSize: 8,
          color: '#444',
          margin: [0, 0, 0, 8]
        },
        {
          table: {
            headerRows: 1,
            widths: cfg.widths,
            body
          },
          layout: 'grid',
          fontSize: 7
        }
      ],
      styles: {
        cellText: { fontSize: 7 },
        cellCenter: { fontSize: 7, alignment: 'center' },
        cellRight: { fontSize: 7, alignment: 'right' },
        tableHeader: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
        totalCell: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e0e0e0' },
        totalCellRight: { fontSize: 7, bold: true, alignment: 'right', fillColor: '#e0e0e0' }
      }
    }

    pdfMake.createPdf(docDefinition).download(`creditos-${segment.value.key}-${dateStr}.pdf`)
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
  }
}

async function exportExcel() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há créditos para exportar', position: 'top' })
    return
  }
  try {
    const XLSX = await import('xlsx')
    const cfg = exportConfig()

    const wsData = [
      [`Créditos — ${segment.value.label}`],
      [`Gerado em ${new Date().toLocaleString('pt-MZ')}`],
      [],
      cfg.headers,
      ...rows.map(row => cfg.keys.map((k, i) => (cfg.money[i] ? Number(row[k]) || 0 : String(row[k] ?? '')))),
      [],
      ['TOTAL', ...cfg.keys.slice(1).map((k, i) => {
        if (!cfg.money[i + 1]) return ''
        return rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)
      })]
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = cfg.headers.map((h, i) => ({ wch: cfg.widths[i] ? Math.ceil(cfg.widths[i] / 6) : 20 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, cfg.sheet)

    const fileName = `creditos-${segment.value.key}-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    $q.notify({ type: 'positive', message: 'Excel gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel', position: 'top' })
  }
}

// ==================== MOUNT ====================
onMounted(async () => {
  const companyId = authStore.companyId
  if (companyId && !companyStore.hasCompany) {
    await companyStore.fetchCompany(companyId).catch(() => {})
  }
  loadManagers()
  fetchLoans()
})
</script>

<style lang="scss" scoped>
.credits-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .credits-page { background: #1a1a2e; }

.filters-card {
  background: #fff;
}
body.body--dark .filters-card {
  background: #252540;
  border-color: rgba(255,255,255,0.06);
}

.stat-card {
  background: #fff;
}
body.body--dark .stat-card {
  background: #252540;
  border-color: rgba(255,255,255,0.06);
}
.stat-card.tone-green { border-left: 3px solid #2e7d32; }
.stat-card.tone-red { border-left: 3px solid #c62828; }
.stat-card.tone-teal { border-left: 3px solid #00695c; }

.capacity-box {
  border-radius: 8px;
  padding: 10px 12px;
}
.capacity-box--ok {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
}
.capacity-box--bad {
  background: #ffebee;
  border: 1px solid #ef9a9a;
}
body.body--dark .capacity-box--ok {
  background: rgba(46, 125, 50, 0.16);
  border-color: rgba(46, 125, 50, 0.45);
}
body.body--dark .capacity-box--bad {
  background: rgba(198, 40, 40, 0.18);
  border-color: rgba(198, 40, 40, 0.5);
}

.table-card {
  background: #fff;
}
body.body--dark .table-card {
  background: #252540;
  border-color: rgba(255,255,255,0.06);
}

.credits-table {
  :deep(.q-table thead th) {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: $grey-6;
    background-color: $grey-1;
  }
  :deep(.q-table tbody td) {
    font-size: 13px;
    padding: 6px 8px;
  }
  :deep(.q-table tbody tr:hover) {
    background-color: $grey-2;
  }
}
body.body--dark {
  .credits-table {
    :deep(.q-table thead th) {
      background-color: $dark-page;
      color: $grey-5;
    }
    :deep(.q-table tbody tr:hover) {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }
}

/* Placeholder da fotografia tipo passe no diálogo de revisão (Pendentes) */
.photo-placeholder {
  background-color: #f3f4f6;
  border: 1px dashed rgba(0, 0, 0, 0.15);
}
body.body--dark .photo-placeholder {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}
</style>
