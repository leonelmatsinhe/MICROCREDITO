<template>
  <q-page class="bank-accounts-page q-pa-md q-pa-lg-lg">
    <!-- ═══════ CABEÇALHO LIMPO E PROFISSIONAL ═══════ -->
    <div class="row items-center justify-between q-col-gutter-sm q-mb-md" data-tour="bank-header">
      <div class="col-12 col-md">
        <div class="row items-center no-wrap">
          <div class="header-icon-box q-mr-sm">
            <q-icon name="account_balance" size="22px" color="primary" />
          </div>
          <div>
            <div class="text-h6 text-weight-bold text-slate-900 q-mb-none" style="letter-spacing: -0.02em">
              Contas Bancárias & Tesouraria
            </div>
            <div class="text-caption text-grey-7">
              Gestão consolidada da liquidez real — bancos comerciais, carteiras móveis e cofre.
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-auto row items-center q-gutter-sm no-wrap">
        <q-btn
          color="primary"
          unelevated
          no-caps
          rounded
          icon="add"
          label="Nova Conta"
          class="q-px-md text-weight-medium"
          @click="openFormDialog()"
        />
        <q-btn
          outline
          color="primary"
          no-caps
          rounded
          icon="swap_horiz"
          label="Transferir Fundos"
          class="q-px-md text-weight-medium"
          data-tour="bank-transferir"
          @click="openTransferDialog()"
        />
        <q-btn
          flat
          round
          icon="refresh"
          color="grey-7"
          :loading="loading"
          @click="fetchAccounts"
        >
          <q-tooltip>Actualizar Saldos</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══════ STRIP DE KPIS EXECUTIVOS (Design Limpo e Despoluído) ═══════ -->
    <q-card flat class="stat-strip q-mb-md" data-tour="bank-kpis">
      <div class="row q-col-gutter-none items-center">
        <!-- Liquidez Total -->
        <div class="col-12 col-sm-6 col-lg-3 stat-col">
          <div class="stat-item">
            <div class="stat-label">Liquidez Total</div>
            <div class="stat-value text-slate-900">{{ formatMZN(totalGeral) }}</div>
            <div class="stat-sub text-grey-6">{{ activeAccounts.length }} contas activas na carteira</div>
          </div>
        </div>

        <!-- Disponível para Desembolsos -->
        <div class="col-12 col-sm-6 col-lg-3 stat-col">
          <div class="stat-item">
            <div class="stat-label">Disponível p/ Desembolsos</div>
            <div class="stat-value text-sky-700">{{ formatMZN(totalDesembolso) }}</div>
            <div class="stat-sub text-grey-6">Autorizado para empréstimos</div>
          </div>
        </div>

        <!-- Depósitos em Bancos -->
        <div class="col-12 col-sm-6 col-lg-3 stat-col">
          <div class="stat-item">
            <div class="stat-label">Depósitos em Bancos</div>
            <div class="stat-value text-slate-800">{{ formatMZN(totalBank) }}</div>
            <div class="stat-sub text-grey-6">Absa, Moza, FNB, BIM</div>
          </div>
        </div>

        <!-- Mobile Money (M-Pesa / e-Mola) -->
        <div class="col-12 col-sm-6 col-lg-3 stat-col">
          <div class="stat-item">
            <div class="stat-label">Mobile Money (M-Pesa / e-Mola)</div>
            <div class="stat-value text-emerald-700">{{ formatMZN(totalMobile) }}</div>
            <div class="stat-sub text-grey-6">Recepção de reembolsos</div>
          </div>
        </div>
      </div>
    </q-card>

    <!-- ═══════ BARRA DE FILTROS E VISTA (Cartões vs Tabela) ═══════ -->
    <div class="row items-center justify-between q-col-gutter-sm q-mb-md">
      <!-- Pesquisa -->
      <div class="col-12 col-sm-5 col-md-4">
        <q-input
          v-model="search"
          dense
          outlined
          rounded
          clearable
          placeholder="Pesquisar banco, número ou titular..."
          bg-color="white"
          class="search-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="18px" color="grey-6" />
          </template>
        </q-input>
      </div>

      <!-- Filtros Rápidos (Pills) -->
      <div class="col-12 col-sm-auto row items-center q-gutter-xs">
        <q-btn
          v-for="opt in quickFilters"
          :key="opt.value"
          :label="opt.label"
          dense
          no-caps
          rounded
          unelevated
          size="sm"
          :color="activeFilter === opt.value ? 'primary' : 'white'"
          :text-color="activeFilter === opt.value ? 'white' : 'grey-8'"
          class="q-px-md filter-pill"
          @click="setQuickFilter(opt.value)"
        />
      </div>

      <q-space />

      <!-- Alternador de Vista (Cartões / Tabela) -->
      <div class="col-auto row items-center q-gutter-sm">
        <span class="text-caption text-grey-6 gt-xs">
          {{ filteredAccounts.length }} {{ filteredAccounts.length === 1 ? 'conta' : 'contas' }}
        </span>
        <q-btn-toggle
          v-model="viewMode"
          dense
          rounded
          unelevated
          toggle-color="primary"
          toggle-text-color="white"
          color="white"
          text-color="grey-7"
          class="view-toggle"
          :options="[
            { icon: 'grid_view', value: 'cards' },
            { icon: 'table_rows', value: 'table' }
          ]"
        >
          <q-tooltip>Alternar entre vista de cartões e tabela</q-tooltip>
        </q-btn-toggle>
      </div>
    </div>

    <!-- ═══════ ESTADO DE CARREGAMENTO / VAZIO ═══════ -->
    <div v-if="loading && accounts.length === 0" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A sincronizar contas de tesouraria...</div>
    </div>

    <q-card v-else-if="filteredAccounts.length === 0" flat class="empty-state text-center q-pa-xl">
      <q-icon name="account_balance" size="48px" color="grey-4" />
      <div class="text-subtitle1 text-weight-medium text-grey-8 q-mt-sm">Nenhuma conta encontrada</div>
      <div class="text-caption text-grey-6">
        {{ search || activeFilter !== 'todos' ? 'Ajuste os filtros de pesquisa para ver mais resultados.' : 'Registe a primeira conta bancária ou carteira da instituição.' }}
      </div>
      <q-btn
        v-if="!search && activeFilter === 'todos'"
        color="primary"
        rounded
        unelevated
        no-caps
        icon="add"
        label="Nova Conta"
        class="q-mt-md"
        @click="openFormDialog()"
      />
    </q-card>

    <!-- ═══════ VISTA 1: CARTÕES MODERNOS E DESPOLUÍDOS ═══════ -->
    <div v-else-if="viewMode === 'cards'" class="row q-col-gutter-md" data-tour="bank-list">
      <div
        v-for="account in filteredAccounts"
        :key="account.id"
        class="col-12 col-md-6 col-xl-4"
      >
        <div class="account-card-clean" :class="{ 'card-inactive': Number(account.is_active) !== 1 }">
          <!-- Cabeçalho do Cartão: Avatar + Info + Pílula de Finalidade + Menu -->
          <div class="row items-center no-wrap q-pa-md card-header-row">
            <!-- Avatar da Instituição -->
            <div class="bank-avatar" :class="bankAvatarClass(account.bank_name, account.type)">
              <q-icon :name="typeIcon(account.type)" size="20px" />
            </div>

            <!-- Identificação do Banco e Conta -->
            <div class="col q-ml-sm" style="min-width: 0">
              <div class="row items-center q-gutter-x-xs no-wrap">
                <span class="text-weight-bold text-slate-900 ellipsis" style="font-size: 15px">
                  {{ account.bank_name || account.accountDescription || 'Conta' }}
                </span>
                <q-badge
                  v-if="Number(account.is_default_desembolso)"
                  color="orange-1"
                  text-color="orange-9"
                  label="Padrão Desembolso"
                  class="q-ml-xs text-weight-medium"
                  style="font-size: 10px; border: 1px solid #ffedd5"
                />
                <q-badge
                  v-if="Number(account.is_default_reembolso)"
                  color="green-1"
                  text-color="green-9"
                  label="Padrão Reembolso"
                  class="q-ml-xs text-weight-medium"
                  style="font-size: 10px; border: 1px solid #dcfce7"
                />
              </div>
              <div class="text-caption text-grey-7 font-mono ellipsis">
                {{ account.accountNumber || 'Sem número' }}
                <span v-if="account.accountHolder" class="text-grey-5 q-ml-xs">· {{ account.accountHolder }}</span>
              </div>
            </div>

            <!-- Pílula de Finalidade & Ações Rápidas -->
            <div class="row items-center q-gutter-xs no-wrap">
              <span :class="`pill-${purposeTone(account.purpose)}`" class="badge-pill">
                {{ purposeLabel(account.purpose) }}
              </span>

              <q-btn flat round dense size="sm" icon="more_vert" color="grey-7">
                <q-menu anchor="bottom right" self="top right">
                  <q-list style="min-width: 200px">
                    <q-item clickable v-close-popup @click="openStatement(account)">
                      <q-item-section avatar><q-icon name="receipt_long" size="18px" color="primary" /></q-item-section>
                      <q-item-section style="font-size: 13px">Ver Extracto Completo</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openTransferDialogFor(account)">
                      <q-item-section avatar><q-icon name="swap_horiz" size="18px" color="teal" /></q-item-section>
                      <q-item-section style="font-size: 13px">Transferir Desta Conta</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openFormDialog(account)">
                      <q-item-section avatar><q-icon name="edit" size="18px" color="grey-8" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar Conta</q-item-section>
                    </q-item>
                    <q-item
                      v-if="Number(account.is_active) === 1 && account.type !== 'CAIXA_FISICO'"
                      clickable
                      v-close-popup
                      @click="openAdjustDialog(account)"
                    >
                      <q-item-section avatar><q-icon name="tune" size="18px" color="deep-purple" /></q-item-section>
                      <q-item-section style="font-size: 13px">Ajustar Saldo Real</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="toggleActive(account, Number(account.is_active) !== 1)">
                      <q-item-section avatar>
                        <q-icon :name="Number(account.is_active) ? 'visibility_off' : 'check_circle'" size="18px" :color="Number(account.is_active) ? 'negative' : 'positive'" />
                      </q-item-section>
                      <q-item-section style="font-size: 13px">
                        {{ Number(account.is_active) ? 'Inactivar Conta' : 'Activar Conta' }}
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </div>

          <!-- Corpo: Saldo em Destaque Limpo (Hero Metric) -->
          <div class="q-px-md q-pb-md">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium" style="font-size: 10px; letter-spacing: 0.05em">
              Saldo Disponível
            </div>
            <div class="row items-baseline q-mt-xs">
              <span class="balance-number" :class="balanceClass(account.balance)">
                {{ formatNumberOnly(account.balance) }}
              </span>
              <span class="text-caption text-grey-6 text-weight-bold q-ml-xs">MZN</span>
            </div>

            <!-- Subtexto explicativo discreto -->
            <div v-if="Number(account.is_active) === 1" class="text-caption text-grey-6 q-mt-sm ellipsis" style="font-size: 11px">
              <q-icon name="info" size="13px" class="q-mr-xs text-grey-5" />
              {{ purposeHint(account.purpose) }}
            </div>
            <div v-else class="text-caption text-negative q-mt-sm" style="font-size: 11px">
              <q-icon name="block" size="13px" class="q-mr-xs" />
              Conta inactiva — não disponível para novos desembolsos ou cobranças.
            </div>
          </div>

          <!-- Rodapé do Cartão: Ações Rápidas + Toggle -->
          <div class="card-footer q-px-md q-py-xs row items-center justify-between">
            <div class="row q-gutter-x-xs">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="primary"
                icon="receipt_long"
                label="Extracto"
                class="q-px-sm action-btn"
                @click="openStatement(account)"
              />
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="grey-8"
                icon="swap_horiz"
                label="Transferir"
                class="q-px-sm action-btn"
                @click="openTransferDialogFor(account)"
              />
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="grey-7"
                icon="edit"
                label="Editar"
                class="q-px-xs action-btn"
                @click="openFormDialog(account)"
              />
            </div>
            <q-toggle
              :model-value="Number(account.is_active) === 1"
              dense
              color="positive"
              size="sm"
              @update:model-value="toggleActive(account, $event)"
            >
              <q-tooltip>{{ Number(account.is_active) ? 'Conta Activa' : 'Conta Inactiva' }}</q-tooltip>
            </q-toggle>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ VISTA 2: TABELA EXECUTIVA (Denso, Limpo, Tipo Planilha) ═══════ -->
    <q-card v-else flat class="table-container-clean">
      <q-table
        :rows="filteredAccounts"
        :columns="tableColumns"
        row-key="id"
        flat
        dense
        separator="horizontal"
        :rows-per-page-options="[10, 25, 50]"
        class="clean-table"
      >
        <!-- Instituição / Banco -->
        <template v-slot:body-cell-bank="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <div class="bank-avatar-sm q-mr-sm" :class="bankAvatarClass(props.row.bank_name, props.row.type)">
                <q-icon :name="typeIcon(props.row.type)" size="14px" />
              </div>
              <div>
                <div class="text-weight-bold text-slate-900">{{ props.row.bank_name }}</div>
                <div class="text-caption text-grey-6">{{ props.row.accountHolder || 'Sem titular' }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Número da Conta -->
        <template v-slot:body-cell-accountNumber="props">
          <q-td :props="props" class="font-mono text-grey-8">
            {{ props.row.accountNumber }}
          </q-td>
        </template>

        <!-- Tipo -->
        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <span class="text-caption text-weight-medium text-grey-8">{{ typeLabel(props.row.type) }}</span>
          </q-td>
        </template>

        <!-- Finalidade -->
        <template v-slot:body-cell-purpose="props">
          <q-td :props="props">
            <span :class="`pill-${purposeTone(props.row.purpose)}`" class="badge-pill">
              {{ purposeLabel(props.row.purpose) }}
            </span>
            <q-badge
              v-if="Number(props.row.is_default_desembolso)"
              color="orange-1"
              text-color="orange-9"
              label="Padrão Desembolso"
              class="q-ml-xs"
              style="font-size: 9px; border: 1px solid #ffedd5"
            />
            <q-badge
              v-if="Number(props.row.is_default_reembolso)"
              color="green-1"
              text-color="green-9"
              label="Padrão Reembolso"
              class="q-ml-xs"
              style="font-size: 9px; border: 1px solid #dcfce7"
            />
          </q-td>
        </template>

        <!-- Saldo Actual -->
        <template v-slot:body-cell-balance="props">
          <q-td :props="props" class="text-right">
            <span class="text-weight-bold" :class="balanceClass(props.row.balance)" style="font-size: 15px">
              {{ formatMZN(props.row.balance) }}
            </span>
          </q-td>
        </template>

        <!-- Estado -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-badge
              :color="Number(props.row.is_active) === 1 ? 'green-1' : 'grey-3'"
              :text-color="Number(props.row.is_active) === 1 ? 'green-9' : 'grey-7'"
              :label="Number(props.row.is_active) === 1 ? 'Activa' : 'Inactiva'"
              rounded
              class="q-px-sm text-weight-medium"
            />
          </q-td>
        </template>

        <!-- Ações -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right q-gutter-x-xs no-wrap">
            <q-btn flat dense round size="sm" icon="receipt_long" color="primary" @click="openStatement(props.row)">
              <q-tooltip>Ver Extracto</q-tooltip>
            </q-btn>
            <q-btn flat dense round size="sm" icon="swap_horiz" color="teal" @click="openTransferDialogFor(props.row)">
              <q-tooltip>Transferir</q-tooltip>
            </q-btn>
            <q-btn flat dense round size="sm" icon="edit" color="grey-7" @click="openFormDialog(props.row)">
              <q-tooltip>Editar Conta</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════ DIALOG: FORMULÁRIO DE CONTA ═══════ -->
    <q-dialog v-model="formDialog" persistent>
      <q-card class="dialog-clean">
        <q-card-section class="row items-center dialog-clean-head q-px-lg q-py-md">
          <q-icon :name="form.id ? 'edit' : 'add_circle'" size="22px" color="primary" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold text-slate-900">
            {{ form.id ? 'Editar Conta Bancária' : 'Nova Conta ou Carteira' }}
          </div>
          <q-space />
          <q-btn flat round dense icon="close" color="grey-6" @click="formDialog = false" />
        </q-card-section>
        <q-separator />

        <q-card-section class="q-gutter-y-md q-pa-lg scroll" style="max-height: 70vh">
          <q-select
            v-model="form.type"
            :options="typeOptions"
            outlined
            dense
            emit-value
            map-options
            label="Tipo de Conta *"
            :rules="[(v) => !!v || 'Selecione o tipo']"
          />
          <q-input
            v-model="form.bank_name"
            outlined
            dense
            label="Banco / Operador *"
            hint="Ex.: Absa Bank, BCI, BIM, Moza, FNB, M-Pesa, e-Mola"
            :rules="[(v) => !!(v && v.trim()) || 'Informe o banco ou operador']"
          />
          <q-input
            v-model="form.bank_code"
            outlined
            dense
            label="Código do Banco (SWIFT / ABI / NIB)"
          />
          <q-input
            v-model="form.accountNumber"
            outlined
            dense
            label="Número da Conta / Telefone *"
            :rules="[(v) => !!(v && v.trim()) || 'Informe o número']"
          />
          <q-input v-model="form.accountHolder" outlined dense label="Titular da Conta" />
          <q-input v-model="form.accountDescription" outlined dense label="Descrição / Finalidade Interna" />
          <q-select
            v-model="form.purpose"
            :options="purposeOptions"
            outlined
            dense
            emit-value
            map-options
            label="Finalidade no Sistema *"
            hint="Determina a disponibilidade nos desembolsos ou recebimentos"
            :rules="[(v) => !!v || 'Selecione a finalidade']"
          />
          <q-select
            v-model="form.currency"
            :options="['MZN', 'USD', 'ZAR']"
            outlined
            dense
            label="Moeda"
          />
          <q-input
            v-if="!form.id"
            v-model.number="form.initial_balance"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Saldo Inicial de Partida"
            hint="Registo do saldo no extracto aquando da criação"
          />
          <div class="row q-col-gutter-md q-pt-xs">
            <div class="col-12 col-sm-6">
              <q-toggle
                v-model="form.is_default_reembolso"
                label="Padrão para Reembolsos"
                dense
                color="primary"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-toggle
                v-model="form.is_default_desembolso"
                label="Padrão para Desembolsos"
                dense
                color="primary"
              />
            </div>
          </div>
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="q-px-lg q-py-md bg-slate-50">
          <q-btn flat no-caps label="Cancelar" color="grey-7" :disable="saving" @click="formDialog = false" />
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            :label="form.id ? 'Guardar Alterações' : 'Criar Conta'"
            :loading="saving"
            class="q-px-lg"
            @click="submitForm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: TRANSFERÊNCIA ENTRE CONTAS ═══════ -->
    <q-dialog v-model="transferDialog" persistent>
      <q-card class="dialog-clean">
        <q-card-section class="row items-center dialog-clean-head q-px-lg q-py-md">
          <q-icon name="swap_horiz" size="22px" color="primary" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold text-slate-900">Transferência entre Contas</div>
          <q-space />
          <q-btn flat round dense icon="close" color="grey-6" @click="transferDialog = false" />
        </q-card-section>
        <q-separator />

        <q-card-section class="q-gutter-y-md q-pa-lg">
          <q-select
            v-model="transferForm.from_account_id"
            :options="transferAccountOptions"
            outlined
            dense
            emit-value
            map-options
            label="Conta de Origem *"
            :rules="[(v) => !!v || 'Selecione a conta de origem']"
          />
          <q-select
            v-model="transferForm.to_account_id"
            :options="transferAccountOptions.filter((option) => option.value !== transferForm.from_account_id)"
            outlined
            dense
            emit-value
            map-options
            label="Conta de Destino *"
            :rules="[(v) => !!v || 'Selecione a conta de destino']"
          />
          <div v-if="transferForm.from_account_id" class="text-caption text-grey-7 bg-slate-50 q-pa-sm rounded-borders">
            Saldo na conta de origem: <strong class="text-slate-900">{{ formatMZN(selectedFromBalance) }}</strong>
            <div v-if="transferAmountInsuficiente" class="text-negative text-weight-bold q-mt-xs">
              <q-icon name="warning" size="14px" /> Valor da transferência excede o saldo disponível!
            </div>
          </div>
          <q-input
            v-model.number="transferForm.amount"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor a Transferir *"
            :rules="[(v) => (v > 0) || 'Valor deve ser superior a zero']"
          />
          <q-input
            v-model="transferForm.description"
            outlined
            dense
            label="Descrição / Referência do Movimento"
            placeholder="Ex.: Transferência interna de liquidez"
          />
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="q-px-lg q-py-md bg-slate-50">
          <q-btn flat no-caps label="Cancelar" color="grey-7" :disable="transferring" @click="transferDialog = false" />
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            label="Efectuar Transferência"
            :loading="transferring"
            :disable="transferAmountInsuficiente"
            class="q-px-lg"
            @click="submitTransfer"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: AJUSTE DE SALDO REAL ═══════ -->
    <q-dialog v-model="adjustDialog" persistent>
      <q-card class="dialog-clean">
        <q-card-section class="row items-center dialog-clean-head q-px-lg q-py-md">
          <q-icon name="tune" size="22px" color="deep-purple" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold text-slate-900">Ajuste de Saldo Real</div>
          <q-space />
          <q-btn flat round dense icon="close" color="grey-6" @click="adjustDialog = false" />
        </q-card-section>
        <q-separator />

        <q-card-section class="q-gutter-y-md q-pa-lg">
          <div class="text-caption text-weight-medium text-slate-800">
            {{ adjustAccount?.bank_name }} · {{ adjustAccount?.accountNumber }}
          </div>
          <q-banner dense rounded class="bg-blue-50 text-blue-9 border-blue-100">
            Introduza o saldo exacto emitido pelo <b>extracto bancário oficial</b> ou aplicação M-Pesa.
            A diferença será registada no extracto como ajuste de conciliação.
          </q-banner>
          <div class="text-caption text-grey-7">
            Saldo actual no sistema: <strong class="text-slate-900">{{ formatMZN(adjustAccount?.balance) }}</strong>
          </div>
          <q-input
            v-model.number="adjustForm.new_balance"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Saldo Real Apurado *"
            :rules="[(v) => (v !== null && v !== undefined && v >= 0) || 'Informe o saldo real (>= 0)']"
          />
          <q-input
            v-model="adjustForm.description"
            outlined
            dense
            label="Motivo da Conciliação"
            placeholder="Ex.: Conciliação com extracto bancário oficial"
          />
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="q-px-lg q-py-md bg-slate-50">
          <q-btn flat no-caps label="Cancelar" color="grey-7" :disable="saving" @click="adjustDialog = false" />
          <q-btn
            unelevated
            rounded
            no-caps
            color="deep-purple"
            label="Confirmar Saldo"
            :loading="saving"
            class="q-px-lg"
            @click="submitAdjust"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: EXTRACTO DA CONTA ═══════ -->
    <q-dialog v-model="statementDialog">
      <q-card class="dialog-xl">
        <q-card-section class="row items-center q-px-lg q-py-md">
          <q-icon name="receipt_long" size="22px" color="primary" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold text-slate-900 ellipsis">
            Extracto: {{ statementAccount?.bank_name }} · {{ statementAccount?.accountNumber }}
          </div>
          <q-space />
          <div class="text-caption text-grey-7 q-mr-md gt-xs">
            Saldo Actual: <strong class="text-slate-900" style="font-size: 14px">{{ formatMZN(statementAccount?.balance) }}</strong>
          </div>
          <q-btn flat round dense icon="close" color="grey-6" @click="statementDialog = false" />
        </q-card-section>
        <q-separator />

        <q-card-section style="max-height: 65vh" class="scroll q-pa-none">
          <q-table
            :rows="statementRows"
            :columns="statementColumns"
            row-key="id"
            flat
            dense
            separator="horizontal"
            :rows-per-page-options="[15, 30, 50]"
            class="clean-table"
          >
            <template v-slot:no-data>
              <div class="full-width text-center q-pa-xl text-grey-6">
                <q-icon name="receipt_long" size="40px" color="grey-4" />
                <div class="q-mt-sm">Nenhum movimento registado nesta conta.</div>
              </div>
            </template>
            <template v-slot:body-cell-createdAt="props">
              <q-td :props="props" class="text-caption text-grey-7 font-mono">
                {{ formatDateTime(props.row.createdAt) }}
              </q-td>
            </template>
            <template v-slot:body-cell-category="props">
              <q-td :props="props" class="text-center">
                <span class="category-chip">{{ props.row.category }}</span>
              </q-td>
            </template>
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="text-right">
                <span class="text-weight-bold" :class="props.row.type === 'ENTRADA' ? 'text-positive' : 'text-negative'">
                  {{ props.row.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(props.row.amount) }}
                </span>
              </q-td>
            </template>
            <template v-slot:body-cell-balanceAfter="props">
              <q-td :props="props" class="text-right text-caption text-weight-medium text-slate-800">
                {{ formatMZN(props.row.balanceAfter) }}
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { format } from 'date-fns'

const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const accounts = ref([])
const search = ref('')
const activeFilter = ref('todos')
const viewMode = ref('cards') // 'cards' ou 'table'

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

function formatMZN(value) {
  return `${(Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} MZN`
}

function formatNumberOnly(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
  } catch { return '—' }
}

const PURPOSES_DESEMBOLSO = ['DESEMBOLSO', 'MISTO']

const activeAccounts = computed(() => accounts.value.filter((account) => Number(account.is_active) === 1))

const totalBank = computed(() =>
  round2(activeAccounts.value.filter((a) => a.type === 'BANCO').reduce((sum, a) => sum + (Number(a.balance) || 0), 0))
)

const totalMobile = computed(() =>
  round2(
    activeAccounts.value
      .filter((a) => ['MOBILE_MONEY', 'EWALLET'].includes(a.type))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  )
)

const totalDesembolso = computed(() =>
  round2(
    activeAccounts.value
      .filter((a) => PURPOSES_DESEMBOLSO.includes(String(a.purpose)))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  )
)

const totalGeral = computed(() => round2(activeAccounts.value.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)))

const quickFilters = [
  { label: 'Todas as Contas', value: 'todos' },
  { label: 'Desembolso', value: 'DESEMBOLSO' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'Bancos', value: 'BANCO' },
  { label: 'Mobile Money', value: 'MOBILE_MONEY' }
]

function setQuickFilter(val) {
  activeFilter.value = val
}

const filteredAccounts = computed(() => {
  const term = search.value ? search.value.trim().toLowerCase() : ''
  return accounts.value.filter((account) => {
    // Filtro por pílula rápida
    if (activeFilter.value === 'DESEMBOLSO' && !PURPOSES_DESEMBOLSO.includes(account.purpose)) return false
    if (activeFilter.value === 'REEMBOLSO' && !['REEMBOLSO', 'MISTO'].includes(account.purpose)) return false
    if (activeFilter.value === 'BANCO' && account.type !== 'BANCO') return false
    if (activeFilter.value === 'MOBILE_MONEY' && !['MOBILE_MONEY', 'EWALLET'].includes(account.type)) return false

    if (!term) return true
    return [account.bank_name, account.accountNumber, account.accountHolder, account.accountDescription]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

const typeOptions = [
  { label: 'Banco Comercial', value: 'BANCO' },
  { label: 'Caixa Físico / Cofre', value: 'CAIXA_FISICO' },
  { label: 'Carteira Móvel (M-Pesa / e-Mola)', value: 'MOBILE_MONEY' },
  { label: 'Carteira Electrónica (e-Wallet)', value: 'EWALLET' }
]

const purposeOptions = [
  { label: 'Reembolso (recebe pagamentos de mutuários)', value: 'REEMBOLSO' },
  { label: 'Desembolso (saída de fundos de crédito)', value: 'DESEMBOLSO' },
  { label: 'Misto (ambos: desembolsos e cobranças)', value: 'MISTO' },
  { label: 'Taxas e Comissões', value: 'TAXAS' },
  { label: 'Reserva Institucional', value: 'RESERVA' }
]

function typeLabel(type) {
  const labels = { BANCO: 'Banco', CAIXA_FISICO: 'Cofre Físico', MOBILE_MONEY: 'Mobile Money', EWALLET: 'e-Wallet' }
  return labels[type] || type
}

function typeIcon(type) {
  const icons = { BANCO: 'account_balance', CAIXA_FISICO: 'savings', MOBILE_MONEY: 'smartphone', EWALLET: 'wallet' }
  return icons[type] || 'account_balance'
}

function purposeLabel(purpose) {
  const map = {
    DESEMBOLSO: 'Desembolso',
    REEMBOLSO: 'Reembolso',
    MISTO: 'Misto',
    RESERVA: 'Reserva',
    TAXAS: 'Taxas'
  }
  return map[purpose] || purpose
}

function purposeTone(purpose) {
  const tones = { DESEMBOLSO: 'orange', REEMBOLSO: 'blue', RESERVA: 'grey', MISTO: 'purple', TAXAS: 'teal' }
  return tones[purpose] || 'blue'
}

function purposeHint(purpose) {
  const hints = {
    DESEMBOLSO: 'Conta autorizada para saídas de desembolso de crédito aos clientes.',
    REEMBOLSO: 'Conta de destino para liquidação de prestações e pagamentos de clientes.',
    MISTO: 'Conta flexível para desembolsos e recepção de cobranças.',
    RESERVA: 'Conta de reserva institucional — não entra nos fluxos automáticos.',
    TAXAS: 'Recebimento de taxas administrativas e comissões.'
  }
  return hints[purpose] || ''
}

function balanceClass(balance) {
  const value = Number(balance) || 0
  if (value < 0) return 'text-negative'
  if (value === 0) return 'text-grey-6'
  return 'text-slate-900'
}

function bankAvatarClass(bankName = '', type = '') {
  const name = String(bankName).toLowerCase()
  if (type === 'MOBILE_MONEY' || name.includes('mpesa') || name.includes('m-pesa')) return 'avatar-mpesa'
  if (name.includes('absa')) return 'avatar-absa'
  if (name.includes('fnb')) return 'avatar-fnb'
  if (name.includes('moza')) return 'avatar-moza'
  if (name.includes('bim') || name.includes('millennium')) return 'avatar-bim'
  if (type === 'CAIXA_FISICO') return 'avatar-vault'
  return 'avatar-default'
}

async function fetchAccounts() {
  loading.value = true
  try {
    const { data } = await api.get('/api/bank-accounts')
    if (data.success) accounts.value = data.result || []
  } catch (error) {
    console.error('Erro ao carregar contas:', error)
    $q.notify({ type: 'negative', message: 'Erro ao carregar contas bancárias', position: 'top' })
  } finally {
    loading.value = false
  }
}

/* ── Formulário de Criação/Edição ── */
const formDialog = ref(false)
const emptyForm = () => ({
  id: null,
  type: 'BANCO',
  bank_name: '',
  bank_code: '',
  accountNumber: '',
  accountDescription: '',
  accountHolder: '',
  purpose: 'MISTO',
  currency: 'MZN',
  initial_balance: 0,
  is_default_reembolso: false,
  is_default_desembolso: false
})
const form = ref(emptyForm())

function openFormDialog(account = null) {
  form.value = account
    ? {
        id: account.id,
        type: account.type || 'BANCO',
        bank_name: account.bank_name || '',
        bank_code: account.bank_code || '',
        accountNumber: account.accountNumber || '',
        accountDescription: account.accountDescription || '',
        accountHolder: account.accountHolder || '',
        purpose: account.purpose || 'MISTO',
        currency: account.currency || 'MZN',
        initial_balance: Number(account.initial_balance) || 0,
        is_default_reembolso: Number(account.is_default_reembolso) === 1,
        is_default_desembolso: Number(account.is_default_desembolso) === 1
      }
    : emptyForm()
  formDialog.value = true
}

async function submitForm() {
  const f = form.value
  if (!f.bank_name?.trim() || !f.accountNumber?.trim()) {
    $q.notify({ type: 'warning', message: 'Preencha o banco e o número da conta', position: 'top' })
    return
  }
  saving.value = true
  try {
    const payload = {
      ...f,
      is_default_reembolso: f.is_default_reembolso ? 1 : 0,
      is_default_desembolso: f.is_default_desembolso ? 1 : 0
    }
    if (f.id) {
      await api.put(`/api/bank-accounts/${f.id}`, payload)
      $q.notify({ type: 'positive', message: 'Conta actualizada com sucesso!', position: 'top' })
    } else {
      await api.post('/api/bank-accounts', payload)
      $q.notify({ type: 'positive', message: 'Conta criada com sucesso!', position: 'top' })
    }
    formDialog.value = false
    await fetchAccounts()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao guardar conta', position: 'top' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(account, value) {
  try {
    await api.put(`/api/bank-accounts/${account.id}`, { is_active: value ? 1 : 0 })
    account.is_active = value ? 1 : 0
    $q.notify({ type: 'positive', message: value ? 'Conta activada' : 'Conta inactivada', position: 'top', timeout: 1500 })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar estado da conta', position: 'top' })
    await fetchAccounts()
  }
}

/* ── Extracto ── */
const statementDialog = ref(false)
const statementAccount = ref(null)
const statementRows = ref([])
const statementColumns = [
  { name: 'createdAt', label: 'Data / Hora', field: 'createdAt', align: 'left' },
  { name: 'category', label: 'Operação', field: 'category', align: 'center' },
  { name: 'description', label: 'Descrição / Referência', field: 'description', align: 'left' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right' },
  { name: 'balanceAfter', label: 'Saldo Resultante', field: 'balanceAfter', align: 'right' }
]

async function openStatement(account) {
  statementAccount.value = account
  statementRows.value = []
  statementDialog.value = true
  try {
    const { data } = await api.get(`/api/bank-accounts/${account.id}/transactions`)
    if (data.success) statementRows.value = data.result?.transactions || []
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao carregar o extracto da conta', position: 'top' })
  }
}

/* ── Ajuste de Saldo Real ── */
const adjustDialog = ref(false)
const adjustAccount = ref(null)
const adjustForm = ref({ new_balance: null, description: '' })

function openAdjustDialog(account) {
  adjustAccount.value = account
  adjustForm.value = { new_balance: Number(account.balance) || 0, description: '' }
  adjustDialog.value = true
}

async function submitAdjust() {
  const value = adjustForm.value.new_balance
  if (value === null || value === undefined || value < 0) {
    $q.notify({ type: 'warning', message: 'Informe o saldo real (>= 0)', position: 'top' })
    return
  }
  saving.value = true
  try {
    await api.post(`/api/bank-accounts/${adjustAccount.value.id}/adjust-balance`, {
      new_balance: value,
      description: adjustForm.value.description
    })
    $q.notify({ type: 'positive', message: 'Saldo conciliado com sucesso!', position: 'top' })
    adjustDialog.value = false
    await fetchAccounts()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao ajustar saldo', position: 'top' })
  } finally {
    saving.value = false
  }
}

/* ── Transferências ── */
const transferDialog = ref(false)
const transferring = ref(false)
const transferForm = ref({ from_account_id: null, to_account_id: null, amount: null, description: '' })

const transferAccountOptions = computed(() =>
  activeAccounts.value
    .filter((account) => account.type !== 'CAIXA_FISICO')
    .map((account) => ({
      label: `${account.bank_name || 'Conta'} (${account.accountNumber}) — Saldo: ${formatMZN(account.balance)}`,
      value: account.id
    }))
)

const selectedFromBalance = computed(() => {
  const account = accounts.value.find((item) => item.id === transferForm.value.from_account_id)
  return account ? Number(account.balance) || 0 : 0
})

const transferAmountInsuficiente = computed(() =>
  transferForm.value.from_account_id &&
  Number(transferForm.value.amount) > 0 &&
  Number(transferForm.value.amount) > selectedFromBalance.value
)

function openTransferDialog() {
  transferForm.value = { from_account_id: null, to_account_id: null, amount: null, description: '' }
  transferDialog.value = true
}

function openTransferDialogFor(account) {
  transferForm.value = { from_account_id: account.id, to_account_id: null, amount: null, description: '' }
  transferDialog.value = true
}

async function submitTransfer() {
  const transfer = transferForm.value
  if (!transfer.from_account_id || !transfer.to_account_id || !transfer.amount || Number(transfer.amount) <= 0) {
    $q.notify({ type: 'warning', message: 'Preencha a conta de origem, destino e valor', position: 'top' })
    return
  }
  if (transferAmountInsuficiente.value) {
    $q.notify({ type: 'negative', message: 'Saldo insuficiente na conta de origem', position: 'top' })
    return
  }
  transferring.value = true
  try {
    await api.post('/api/bank-accounts/transfer', {
      from_account_id: transfer.from_account_id,
      to_account_id: transfer.to_account_id,
      amount: Number(transfer.amount),
      description: transfer.description || undefined
    })
    $q.notify({ type: 'positive', message: 'Transferência executada com sucesso!', position: 'top' })
    transferDialog.value = false
    await fetchAccounts()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro na transferência', position: 'top' })
  } finally {
    transferring.value = false
  }
}

/* ── Tabela Executiva ── */
const tableColumns = [
  { name: 'bank', label: 'Instituição / Banco', field: 'bank_name', align: 'left', sortable: true },
  { name: 'accountNumber', label: 'Nº da Conta / Telefone', field: 'accountNumber', align: 'left', sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left', sortable: true },
  { name: 'purpose', label: 'Finalidade', field: 'purpose', align: 'left', sortable: true },
  { name: 'balance', label: 'Saldo Actual', field: 'balance', align: 'right', sortable: true },
  { name: 'status', label: 'Estado', field: 'is_active', align: 'center', sortable: true },
  { name: 'actions', label: 'Ações', align: 'right' }
]

onMounted(fetchAccounts)
</script>

<style lang="scss" scoped>
.bank-accounts-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}

.header-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba($primary, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba($primary, 0.15);
}

/* ── Faixa de KPIs Executivos ── */
.stat-strip {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.stat-col {
  border-right: 1px solid #f1f5f9;
  &:last-child {
    border-right: none;
  }
  @media (max-width: 1023px) {
    &:nth-child(2) {
      border-right: none;
    }
    border-bottom: 1px solid #f1f5f9;
  }
}

.stat-item {
  padding: 16px 20px;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.stat-sub {
  font-size: 11px;
  margin-top: 2px;
}

/* ── Barra de Filtros ── */
.search-input {
  :deep(.q-field__control) {
    border-radius: 9999px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
}

.filter-pill {
  border: 1px solid #e2e8f0;
  font-weight: 500;
  transition: all 0.15s ease;
}

.view-toggle {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

/* ── Cartões Limpos e Despoluídos ── */
.account-card-clean {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
    transform: translateY(-2px);
  }
}

.card-inactive {
  opacity: 0.65;
  background: #f8fafc;
}

.card-header-row {
  border-bottom: 1px solid #f8fafc;
}

.balance-number {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.card-footer {
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
}

.action-btn {
  font-weight: 500;
  border-radius: 6px;
}

/* ── Avatares das Instituições ── */
.bank-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bank-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-absa    { background: #fff1f2; color: #be123c; border: 1px solid #ffe4e6; }
.avatar-mpesa   { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }
.avatar-fnb     { background: #ecfeff; color: #0e7490; border: 1px solid #cffafe; }
.avatar-moza    { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
.avatar-bim     { background: #eef2ff; color: #4338ca; border: 1px solid #e0e7ff; }
.avatar-vault   { background: #fefce8; color: #a16207; border: 1px solid #fef08a; }
.avatar-default { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }

/* ── Pílulas de Finalidade ── */
.badge-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
}

.pill-orange { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
.pill-blue   { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
.pill-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #f3e8ff; }
.pill-teal   { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }
.pill-grey   { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }

/* ── Tabela Limpa ── */
.table-container-clean {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}

.clean-table {
  :deep(thead tr th) {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.04em;
    background: #f8fafc;
    padding: 12px 16px;
  }
  :deep(tbody tr td) {
    padding: 12px 16px;
  }
  :deep(tbody tr:hover) {
    background: #f8fafc;
  }
}

.category-chip {
  background: #f1f5f9;
  color: #334155;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

/* ── Diálogos Limpos ── */
.dialog-clean {
  width: 520px;
  max-width: 95vw;
  border-radius: 16px;
  background: #ffffff;
}

.dialog-clean-head {
  background: #ffffff;
}

.dialog-xl {
  width: 920px;
  max-width: 95vw;
  border-radius: 16px;
}

.empty-state {
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  background: #ffffff;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.text-slate-900 { color: #0f172a; }
.text-slate-800 { color: #1e293b; }
.text-sky-700   { color: #0369a1; }
.text-emerald-700 { color: #047857; }
.bg-slate-50    { background-color: #f8fafc; }
.border-blue-100 { border: 1px solid #dbeafe; }

body.body--dark {
  .bank-accounts-page {
    background: #0b1329;
  }

  .stat-strip,
  .account-card,
  .table-card,
  .empty-card {
    background: #162032 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .account-card-header {
    background: #0f172a !important;
  }

  .text-slate-900 { color: #f8fafc !important; }
  .text-slate-800 { color: #f1f5f9 !important; }
  .bg-slate-50 { background-color: #0f172a !important; }
  .border-blue-100 { border-color: rgba(59, 130, 246, 0.25) !important; }
}
</style>
