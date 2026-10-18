<template>
  <div class="q-pa-md caixa-page" data-tour="caixa-central">
    <!-- ═══════════ CARREGAMENTO ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar o Caixa Central...</div>
    </div>

    <template v-else>
      <!-- ═══════════ SEM CAIXA HOJE: BANNER + BOTÃO ABRIR ═══════════ -->
      <q-card v-if="!register" flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="text-center q-pa-xl">
          <q-icon name="account_balance_wallet" size="64px" color="grey-5" />
          <div class="text-h6 q-mt-md">Nenhum caixa aberto hoje - {{ formatDay(today) }}</div>
          <div class="text-caption text-grey-6 q-mb-lg">
            O caixa é obrigatório para operar — é o diário de auditoria de desembolsos,
            reembolsos e despesas (mesmo para movimento 100% electrónico).
          </div>
          <q-btn
            color="primary"
            size="lg"
            no-caps
            unelevated
            icon="point_of_sale"
            label="Abrir Caixa do Dia"
            data-tour="caixa-central-abrir"
            :loading="saving"
            @click="openOpenDialog"
          />
        </q-card-section>
      </q-card>

      <template v-else>
        <!-- ═══════════ CABEÇALHO: STATUS DO CAIXA ═══════════ -->
        <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
          <q-card-section class="row items-center q-py-md">
            <q-icon
              :name="isOpen ? 'lock_open' : 'lock'"
              :color="isOpen ? 'positive' : 'grey-6'"
              size="28px"
              class="q-mr-sm"
            />
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">
                Caixa Central de {{ formatDay(register.opening_date) }}
                <q-badge :color="isOpen ? 'positive' : 'grey'" class="q-ml-sm" align="middle">
                  {{ isOpen ? 'ABERTO' : 'FECHADO' }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-6">
                Aberto às {{ formatTime(register.opening_time || register.createdAt) }}
                <template v-if="!isOpen"> · Fechado às {{ formatTime(register.closing_time || register.closed_at) }}</template>
              </div>

              <!-- ═══ LIMITE DE NUMERÁRIO EM CAIXA (circular do Banco de Moçambique) ═══ -->
              <!-- CONFERÊNCIA CEGA: escondido durante o fecho (nunca mostrar
                   dinheiro em gaveta/saldo teórico enquanto o operador conta). -->
              <div v-if="!closeDialog && register.limites" class="q-mt-xs">
                <q-banner
                  v-if="register.limites.excedido"
                  dense
                  rounded
                  class="bg-negative text-white"
                  style="border-radius: 8px"
                >
                  <template v-slot:avatar>
                    <q-icon name="warning" color="white" />
                  </template>
                  <div class="text-caption">
                    <strong>Limite de Numerário Excedido - Efectuar Entrega ao Cofre Central nos termos da Circular BM</strong>
                    — em gaveta <strong>{{ formatMZN(register.limites.dinheiro_em_caixa) }}</strong>
                    (limite {{ formatMZN(register.limites.cash_limit_mzn) }}, excedente
                    {{ formatMZN(register.limites.excedente) }}). Registe uma
                    <strong>Entrega de Valores ao Cofre Central</strong> (ENTREGA_COFRE) ou uma
                    <strong>Guia de Depósito Bancário</strong> (DEPOSITO_BANCARIO) do excedente antes de continuar a operar.
                  </div>
                </q-banner>
                <div v-else class="text-caption text-grey-6" style="font-size: 10px">
                  <q-icon name="savings" size="12px" class="q-mr-xs" />
                  Limite de numerário em caixa: <strong>{{ formatMZN(register.limites.cash_limit_mzn) }}</strong>
                  · em gaveta: <strong>{{ formatMZN(register.limites.dinheiro_em_caixa) }}</strong>
                </div>
              </div>
            </div>
            <div class="row q-gutter-sm no-wrap">
              <q-btn flat no-caps icon="account_balance" label="Contas Bancárias" @click="$router.push('/bank-accounts')">
                <q-tooltip>Gerir carteira de contas bancárias</q-tooltip>
              </q-btn>
              <q-btn flat no-caps icon="picture_as_pdf" label="PDF" :disable="movements.length === 0" @click="exportPDF">
                <q-tooltip>Resumo do dia em PDF</q-tooltip>
              </q-btn>
              <q-btn flat no-caps icon="history" label="Histórico" @click="$router.push('/caixa/historico')">
                <q-tooltip>Histórico e auditoria de caixas</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isOpen"
                color="negative"
                outline
                no-caps
                icon="lock"
                label="Efectuar Fecho"
                @click="openCloseDialog"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- ═══════════ CARD: CAIXA DO SISTEMA (portal fora de expediente) ═══════════ -->
        <q-card
          v-if="systemRegister"
          flat
          bordered
          class="q-mb-md"
          style="border-radius: 12px; border-left: 4px solid #7b1fa2"
        >
          <q-card-section class="row items-center q-py-md">
            <q-icon name="nightlight" size="26px" color="purple" class="q-mr-sm" />
            <div class="col">
              <div class="text-subtitle2 text-weight-bold">
                Caixa do Sistema — Portal
                <q-badge :color="systemRegister.status === 'ABERTO' ? 'purple' : 'grey'" class="q-ml-sm" align="middle">
                  {{ systemRegister.status }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-6">
                Pagamentos do portal recebidos fora do expediente — dinheiro electrónico,
                sem afectar a gaveta. Reconciliar ao abrir o caixa real.
              </div>
            </div>
            <!-- Totais bancários do Caixa do Sistema -->
            <div class="row q-gutter-md no-wrap q-mr-md">
              <div class="text-center">
                <div class="text-caption text-grey-6" style="font-size: 10px">Entradas Banco</div>
                <div class="text-weight-bold text-positive" style="font-size: 14px">{{ formatMZN(systemRegister.total_bank_in) }}</div>
              </div>
              <div class="text-center">
                <div class="text-caption text-grey-6" style="font-size: 10px">Saídas Banco</div>
                <div class="text-weight-bold text-negative" style="font-size: 14px">{{ formatMZN(systemRegister.total_bank_out) }}</div>
              </div>
              <div class="text-center">
                <div class="text-caption text-grey-6" style="font-size: 10px">Movimentos</div>
                <div class="text-weight-bold" style="font-size: 14px">{{ systemRegister.movements?.length || 0 }}</div>
              </div>
            </div>
            <q-btn
              flat
              round
              dense
              size="sm"
              :icon="showSystemMovements ? 'expand_less' : 'expand_more'"
              color="grey-7"
              @click="showSystemMovements = !showSystemMovements"
            >
              <q-tooltip>{{ showSystemMovements ? 'Esconder movimentos' : 'Ver movimentos do portal' }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="systemRegister.status === 'ABERTO'"
              color="purple"
              outline
              no-caps
              icon="lock"
              label="Fechar"
              size="sm"
              class="q-ml-sm"
              @click="openSystemCloseDialog"
            >
              <q-tooltip>Reconciliar e fechar o Caixa do Sistema de hoje</q-tooltip>
            </q-btn>
          </q-card-section>

          <!-- Movimentos do portal (expansível) -->
          <q-slide-transition>
            <q-card-section v-if="showSystemMovements" class="q-pt-none">
              <q-separator class="q-mb-sm" />
              <div v-if="!systemRegister.movements || systemRegister.movements.length === 0" class="text-caption text-grey-6">
                Sem movimentos neste Caixa do Sistema.
              </div>
              <q-list v-else dense separator style="max-height: 240px; overflow-y: auto">
                <q-item v-for="movement in systemRegister.movements" :key="movement.id">
                  <q-item-section avatar>
                    <q-badge :color="movement.type === 'ENTRADA' ? 'positive' : 'negative'" style="font-size: 10px">
                      {{ movement.type === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA' }}
                    </q-badge>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label style="font-size: 12px">{{ movement.description }}</q-item-label>
                    <q-item-label caption style="font-size: 10px">
                      {{ methodLabel(movement.paymentMethod) }} · {{ formatTime(movement.createdAt) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <span
                      class="text-weight-bold"
                      :class="movement.type === 'ENTRADA' ? 'text-positive' : 'text-negative'"
                      style="font-size: 12px"
                    >
                      {{ movement.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(movement.amount) }}
                    </span>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-slide-transition>
        </q-card>

        <!-- ═══════════ 6 CARDS DE RESUMO ═══════════ -->
        <div class="row q-col-gutter-md q-mb-md" data-tour="caixa-central-resumo">
          <div class="col-6 col-md-2" v-for="card in summaryCards" :key="card.label">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-6" style="font-size: 10px">{{ card.label }}</div>
                <div class="text-weight-bold" :class="card.class" style="font-size: 15px">{{ formatMZN(card.value) }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- ═══════════ RESULTADO DO FECHO (caixa fechado) ═══════════ -->
        <q-banner v-if="!isOpen" rounded class="q-mb-md bg-grey-2" style="border-radius: 10px">
          <template v-slot:avatar>
            <q-icon
              :name="Math.abs(Number(register.difference)) < 0.01 ? 'check_circle' : 'warning'"
              :color="Math.abs(Number(register.difference)) < 0.01 ? 'positive' : 'warning'"
            />
          </template>
          <span class="text-body2">
            Numerário contado (por denominação): <strong>{{ formatMZN(register.closing_balance_informed) }}</strong> ·
            Diferença apurada:
            <strong :class="Math.abs(Number(register.difference)) < 0.01 ? 'text-positive' : 'text-negative'">
              {{ formatMZN(register.difference) }}
            </strong>
            <template v-if="register.tipo_fechamento">
              · Tipo de fecho:
              <strong>{{ register.mapa_bm?.tipo_fechamento_label || register.tipo_fechamento }}</strong>
            </template>
          </span>
          <template v-slot:action>
            <q-btn
              no-caps
              color="primary"
              icon="print"
              label="Imprimir Mapa Diário de Caixa - Modelo BM"
              @click="exportPDF"
            />
          </template>
          <div
            v-if="Math.abs(Number(register.difference)) >= 0.01"
            class="text-caption text-negative q-mt-xs"
          >
            <q-icon name="gavel" size="13px" class="q-mr-xs" />
            Auto de ocorrência gerado automaticamente (DIFERENCA_CAIXA) e <strong>pendente</strong> de
            justificação pelo Administrador e de lançamento na conta <strong>58 — Quebras de Caixa</strong>.
          </div>
        </q-banner>

        <!-- ═══════════ TABS: MOVIMENTOS / CONTAS BANCÁRIAS ═══════════ -->
        <q-card flat bordered style="border-radius: 12px; overflow: hidden">
          <q-tabs v-model="tab" data-tour="caixa-central-tabs" dense no-caps align="left" active-color="primary" class="text-grey-7">
            <q-tab name="movimentos" icon="receipt_long" label="Movimentos do Dia" />
            <q-tab name="bancos" icon="account_balance" label="Contas Bancárias" />
            <q-tab name="diferencas" icon="report_problem" label="Diferenças de Caixa">
              <q-badge
                v-if="pendingDifferencesCount > 0"
                color="negative"
                floating
                :label="pendingDifferencesCount"
              />
            </q-tab>
            <q-tab name="tesouraria" icon="savings" label="Painel de Tesouraria" />
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="tab" animated>
            <!-- ── TAB 1: MOVIMENTOS DO DIA ── -->
            <q-tab-panel name="movimentos" class="q-pa-none">
              <q-card-section class="row items-center q-py-sm">
                <q-select
                  v-model="methodFilter"
                  :options="methodFilterOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Método"
                  style="min-width: 150px"
                  clearable
                  class="q-mr-sm"
                />
                <q-space />
                <template v-if="isOpen">
                  <q-btn outline color="positive" no-caps icon="add_circle" label="Nova Entrada" size="sm" class="q-mr-sm" @click="openMovementDialog('ENTRADA')" />
                  <q-btn outline color="negative" no-caps icon="remove_circle" label="Nova Saída" size="sm" class="q-mr-sm" @click="openMovementDialog('SAIDA')" />
                  <q-btn outline color="primary" no-caps icon="upload" label="Depositar no Banco" size="sm" class="q-mr-sm" @click="depositDialog = true" />
                  <q-btn outline color="primary" no-caps icon="download" label="Levantar do Banco" size="sm" @click="withdrawDialog = true" />
                </template>
              </q-card-section>

              <q-table
                :rows="filteredMovements"
                :columns="columns"
                row-key="id"
                flat
                bordered
                dense
                separator="horizontal"
                :rows-per-page-options="[10, 25, 50]"
                v-model:pagination="pagination"
                no-data-label="Sem movimentos registados hoje."
              >
                <!-- Hora -->
                <template v-slot:body-cell-time="props">
                  <q-td :props="props" class="text-center">{{ formatTime(props.row.createdAt) }}</q-td>
                </template>

                <!-- Método (chip: BANK verde / CASH laranja) -->
                <template v-slot:body-cell-method="props">
                  <q-td :props="props" class="text-center">
                    <q-chip :color="methodColor(props.row.paymentMethod)" text-color="white" dense style="font-size: 10px">
                      {{ methodLabel(props.row.paymentMethod) }}
                    </q-chip>
                  </q-td>
                </template>

                <!-- Categoria -->
                <template v-slot:body-cell-category="props">
                  <q-td :props="props" class="text-center">
                    <q-chip :color="categoryColor(props.row.category)" text-color="white" dense style="font-size: 10px">
                      {{ categoryLabel(props.row.category) }}
                    </q-chip>
                    <q-badge v-if="props.row.isAutomatic" outline color="grey-6" label="auto" style="font-size: 9px; margin-left: 4px" />
                  </q-td>
                </template>

                <!-- Conta bancária -->
                <template v-slot:body-cell-account="props">
                  <q-td :props="props" class="text-center text-caption">
                    {{ accountLabelFor(props.row) }}
                  </q-td>
                </template>

                <!-- Valor -->
                <template v-slot:body-cell-amount="props">
                  <q-td :props="props" class="text-right">
                    <span class="text-weight-bold" :class="props.row.type === 'ENTRADA' ? 'text-positive' : 'text-negative'">
                      {{ props.row.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(props.row.amount) }}
                    </span>
                  </q-td>
                </template>

                <!-- Utilizador -->
                <template v-slot:body-cell-user="props">
                  <q-td :props="props" class="text-center text-caption">{{ props.row.createdByName || '—' }}</q-td>
                </template>

                <!-- Comprovativo de Entrega de Valores ao Cofre Central (PDF + QR) -->
                <template v-slot:body-cell-comprovativo="props">
                  <q-td :props="props" class="text-center">
                    <q-btn
                      v-if="props.row.category === 'ENTREGA_COFRE'"
                      flat
                      dense
                      round
                      icon="description"
                      color="primary"
                      @click.stop="downloadComprovativo(props.row)"
                    >
                      <q-tooltip>Comprovativo de Entrega de Valores ao Cofre Central (PDF + QR de validação)</q-tooltip>
                    </q-btn>
                    <span v-else class="text-grey-5">—</span>
                  </q-td>
                </template>
              </q-table>
            </q-tab-panel>

            <!-- ── TAB 2: CONTAS BANCÁRIAS ── -->
            <q-tab-panel name="bancos" class="q-pa-none">
              <q-card-section class="row items-center q-py-sm">
                <div class="col text-subtitle2 text-weight-bold">
                  Carteira real — saldos actualizados pela tesouraria
                </div>
                <q-btn outline color="primary" no-caps icon="sync" label="Actualizar" size="sm" @click="fetchAccounts" />
              </q-card-section>
              <q-table
                :rows="accounts"
                :columns="accountColumns"
                row-key="id"
                flat
                bordered
                dense
                separator="horizontal"
                :rows-per-page-options="[10, 25]"
                no-data-label="Nenhuma conta bancária registada. Registe em Contas Bancárias."
              >
                <template v-slot:body-cell-bank="props">
                  <q-td :props="props">
                    <div class="text-weight-bold">{{ props.row.bank_name || '—' }}</div>
                    <div class="text-caption text-grey-6">{{ props.row.accountNumber }}</div>
                  </q-td>
                </template>
                <template v-slot:body-cell-purpose="props">
                  <q-td :props="props" class="text-center">
                    <q-chip outline dense color="primary" style="font-size: 10px">{{ props.row.purpose }}</q-chip>
                  </q-td>
                </template>
                <template v-slot:body-cell-balance="props">
                  <q-td :props="props" class="text-right text-weight-bold">{{ formatMZN(props.row.balance) }}</q-td>
                </template>
                <template v-slot:body-cell-active="props">
                  <q-td :props="props" class="text-center">
                    <q-badge :color="Number(props.row.is_active) ? 'positive' : 'grey'">
                      {{ Number(props.row.is_active) ? 'Ativa' : 'Inativa' }}
                    </q-badge>
                  </q-td>
                </template>
              </q-table>
            </q-tab-panel>

            <!-- ── TAB 3: DIFERENÇAS DE CAIXA (QUEBRAS / SOBRAS) — ADMIN ── -->
            <q-tab-panel name="diferencas" class="q-pa-none">
              <q-card-section class="q-py-sm">
                <div class="text-caption text-grey-7">
                  <q-icon name="info" size="14px" class="q-mr-xs" />
                  Diferenças apuradas no fecho do caixa (contagem cega por denominação). Quebras e sobras
                  ficam <strong>pendentes</strong> até o Administrador justificar o auto de ocorrência e
                  lançar o valor na conta <strong>58 — Quebras de Caixa</strong> do Livro Caixa.
                </div>
              </q-card-section>

              <q-card-section class="row q-col-gutter-md q-pt-none">
                <div class="col-12 col-sm-4">
                  <q-card flat bordered style="border-radius: 12px">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-grey-6" style="font-size: 10px">Diferenças pendentes</div>
                      <div class="text-weight-bold text-negative" style="font-size: 16px">
                        {{ formatMZN(differenceSummary.valor_pendente) }}
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-12 col-sm-4">
                  <q-card flat bordered style="border-radius: 12px">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-grey-6" style="font-size: 10px">Nº pendentes</div>
                      <div class="text-weight-bold" style="font-size: 16px">{{ differenceSummary.pendentes }}</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-12 col-sm-4">
                  <q-card flat bordered style="border-radius: 12px">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-grey-6" style="font-size: 10px">Conta de lançamento</div>
                      <div class="text-weight-bold text-primary" style="font-size: 14px">
                        {{ differenceSummary.conta_contabilistica || '58 — Quebras de Caixa' }}
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </q-card-section>

              <q-card-section class="row items-center q-py-sm">
                <q-select
                  v-model="differenceFilter"
                  :options="differenceFilterOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Filtro"
                  style="min-width: 180px"
                  class="q-mr-sm"
                />
                <q-space />
                <q-btn
                  outline
                  color="primary"
                  no-caps
                  icon="sync"
                  label="Actualizar"
                  size="sm"
                  :loading="loadingDifferences"
                  @click="fetchDifferences"
                />
              </q-card-section>

              <q-table
                :rows="differences"
                :columns="differenceColumns"
                row-key="id"
                flat
                bordered
                dense
                separator="horizontal"
                :rows-per-page-options="[10, 25, 50]"
                :loading="loadingDifferences"
                no-data-label="Nenhuma diferença de caixa registada."
              >
                <!-- Dia -->
                <template v-slot:body-cell-dia="props">
                  <q-td :props="props" class="text-center">
                    {{ props.row.data_caixa ? formatDay(props.row.data_caixa) : '—' }}
                  </q-td>
                </template>

                <!-- Tipo: quebra (falta) ou sobra (excesso) -->
                <template v-slot:body-cell-tipo="props">
                  <q-td :props="props" class="text-center">
                    <q-chip
                      :color="props.row.tipo === 'QUEBRA' ? 'negative' : 'positive'"
                      text-color="white"
                      dense
                      style="font-size: 10px"
                    >
                      {{ props.row.tipo_label || props.row.tipo }}
                    </q-chip>
                  </q-td>
                </template>

                <!-- Valores (o apurado é informação de controlo do Admin) -->
                <template v-slot:body-cell-valor="props">
                  <q-td :props="props" class="text-right text-weight-bold">
                    <span :class="props.row.tipo === 'QUEBRA' ? 'text-negative' : 'text-positive'">
                      {{ props.row.tipo === 'QUEBRA' ? '−' : '+' }} {{ formatMZN(props.row.valor) }}
                    </span>
                  </q-td>
                </template>
                <template v-slot:body-cell-contado="props">
                  <q-td :props="props" class="text-right text-caption">{{ formatMZN(props.row.valor_contado) }}</q-td>
                </template>
                <template v-slot:body-cell-apurado="props">
                  <q-td :props="props" class="text-right text-caption">{{ formatMZN(props.row.valor_apurado) }}</q-td>
                </template>

                <!-- Estado -->
                <template v-slot:body-cell-estado="props">
                  <q-td :props="props" class="text-center">
                    <q-badge :color="props.row.status === 'PENDENTE' ? 'warning' : 'positive'">
                      {{ props.row.status === 'PENDENTE' ? 'PENDENTE' : 'LANÇADA' }}
                    </q-badge>
                  </q-td>
                </template>

                <!-- Auto de ocorrência (justificação lançada) -->
                <template v-slot:body-cell-justificacao="props">
                  <q-td :props="props" class="text-caption" style="max-width: 260px">
                    <template v-if="props.row.status === 'JUSTIFICADA'">
                      <div class="ellipsis" style="max-width: 250px">
                        {{ props.row.justificacao }}
                        <q-tooltip max-width="380px">
                          {{ props.row.justificacao }}<br />
                          Justificado em {{ formatDateTime(props.row.justifiedAt) }}
                          (utilizador #{{ props.row.justifiedBy }})
                        </q-tooltip>
                      </div>
                      <div class="text-grey-6" style="font-size: 10px">
                        {{ formatDateTime(props.row.justifiedAt) }}
                      </div>
                    </template>
                    <span v-else class="text-grey-6">—</span>
                  </q-td>
                </template>

                <!-- Acção: justificar e lançar (só para pendentes) -->
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-center">
                    <q-btn
                      v-if="props.row.status === 'PENDENTE'"
                      outline
                      dense
                      no-caps
                      color="primary"
                      icon="gavel"
                      label="Justificar e lançar"
                      size="sm"
                      @click="openJustifyDialog(props.row)"
                    />
                    <span v-else class="text-caption text-positive">
                      <q-icon name="check_circle" size="14px" class="q-mr-xs" />Lançada
                    </span>
                  </q-td>
                </template>
              </q-table>
            </q-tab-panel>

            <!-- ── TAB 4: PAINEL DE TESOURARIA (por operador) ── -->
            <q-tab-panel name="tesouraria" class="q-pa-none">
              <q-card-section class="row items-center q-py-sm">
                <div class="col text-subtitle2 text-weight-bold">
                  Painel de Tesouraria — excedentes do limite e diferenças pendentes por operador
                </div>
                <q-btn outline color="primary" no-caps icon="sync" label="Actualizar" size="sm" @click="fetchTreasuryPanel" />
              </q-card-section>

              <!-- Cards de resumo -->
              <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-3">
                    <q-card flat bordered style="border-radius: 12px">
                      <q-card-section class="q-pa-sm">
                        <div class="text-caption text-grey-6" style="font-size: 10px">Limite de numerário em caixa</div>
                        <div class="text-weight-bold" style="font-size: 15px">{{ formatMZN(treasuryPanel.limite?.cash_limit_mzn) }}</div>
                        <div class="text-caption text-grey-6" style="font-size: 10px">parametrizável (CASH_LIMIT_MZN)</div>
                      </q-card-section>
                    </q-card>
                  </div>
                  <div class="col-12 col-sm-3">
                    <q-card flat bordered style="border-radius: 12px">
                      <q-card-section class="q-pa-sm">
                        <div class="text-caption text-grey-6" style="font-size: 10px">Excedentes do limite</div>
                        <div class="text-weight-bold text-negative" style="font-size: 15px">{{ treasuryPanel.summary?.total_excedentes || 0 }}</div>
                        <div class="text-caption text-negative" style="font-size: 10px">{{ formatMZN(treasuryPanel.summary?.valor_excedentes) }} acima do limite</div>
                      </q-card-section>
                    </q-card>
                  </div>
                  <div class="col-12 col-sm-3">
                    <q-card flat bordered style="border-radius: 12px">
                      <q-card-section class="q-pa-sm">
                        <div class="text-caption text-grey-6" style="font-size: 10px">Diferenças pendentes</div>
                        <div class="text-weight-bold text-negative" style="font-size: 15px">{{ treasuryPanel.summary?.total_diferencas_pendentes || 0 }}</div>
                        <div class="text-caption text-grey-6" style="font-size: 10px">{{ formatMZN(treasuryPanel.summary?.valor_diferencas_pendentes) }} por justificar</div>
                      </q-card-section>
                    </q-card>
                  </div>
                  <div class="col-12 col-sm-3">
                    <q-card flat bordered style="border-radius: 12px">
                      <q-card-section class="q-pa-sm">
                        <div class="text-caption text-grey-6" style="font-size: 10px">Conta de lançamento</div>
                        <div class="text-weight-bold text-primary" style="font-size: 14px">{{ treasuryPanel.summary?.conta_contabilistica || '58 — Quebras de Caixa' }}</div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </q-card-section>

              <!-- Excedentes do limite de numerário (por operador) -->
              <q-card-section class="q-pb-none">
                <div class="text-subtitle2 text-weight-bold q-mb-sm">
                  <q-icon name="warning" color="negative" class="q-mr-xs" />Excedentes do limite de numerário em caixa
                </div>
                <q-table
                  :rows="treasuryPanel.excedentes || []"
                  :columns="excessColumns"
                  row-key="registerId"
                  flat
                  bordered
                  dense
                  separator="horizontal"
                  hide-bottom
                  no-data-label="Nenhum caixa acima do limite de numerário."
                >
                  <template v-slot:body-cell-dinheiro="props">
                    <q-td :props="props" class="text-right">{{ formatMZN(props.row.dinheiro_em_caixa) }}</q-td>
                  </template>
                  <template v-slot:body-cell-limite="props">
                    <q-td :props="props" class="text-right">{{ formatMZN(props.row.cash_limit_mzn) }}</q-td>
                  </template>
                  <template v-slot:body-cell-excedente="props">
                    <q-td :props="props" class="text-right text-negative text-weight-bold">{{ formatMZN(props.row.excedente) }}</q-td>
                  </template>
                </q-table>
              </q-card-section>

              <!-- Diferenças de caixa pendentes por operador -->
              <q-card-section>
                <div class="text-subtitle2 text-weight-bold q-mb-sm">
                  <q-icon name="report_problem" color="amber-9" class="q-mr-xs" />Diferenças de caixa pendentes por operador
                </div>
                <q-table
                  :rows="treasuryPanel.diferencas_por_operador || []"
                  :columns="treasuryDiffColumns"
                  row-key="userId"
                  flat
                  bordered
                  dense
                  separator="horizontal"
                  hide-bottom
                  no-data-label="Sem diferenças de caixa pendentes."
                >
                  <template v-slot:body-cell-valor="props">
                    <q-td :props="props" class="text-right text-weight-bold">{{ formatMZN(props.row.valor_pendente) }}</q-td>
                  </template>
                </q-table>
                <div class="text-caption text-grey-7 q-mt-sm">
                  <q-icon name="info" size="13px" class="q-mr-xs" />
                  As diferenças pendentes são justificadas e lançadas no separador
                  <strong>Diferenças de Caixa</strong> (conta 58 — Quebras de Caixa).
                </div>
              </q-card-section>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>

        <!-- ═══════════ RODAPÉ: OPERAÇÕES OFICIAIS DE TESOURARIA (terminologia BM) ═══════════ -->
        <div v-if="isOpen" class="q-mt-md q-pa-sm rounded-borders bg-grey-1 row q-gutter-sm items-center" data-tour="caixa-central-tesouraria">
          <div class="text-caption text-grey-7 q-mr-sm">
            <q-icon name="savings" size="14px" class="q-mr-xs" />Operações de tesouraria:
          </div>
          <q-btn
            v-for="op in TREASURY_OPERATIONS"
            :key="op.category"
            no-caps
            :color="categoryColor(op.category)"
            :icon="op.icon"
            :label="op.label"
            @click="openTreasuryDialog(op)"
          >
            <q-tooltip>{{ op.hint }}</q-tooltip>
          </q-btn>
        </div>
      </template>
    </template>

    <!-- ═══════════ DIALOG: ABRIR CAIXA ═══════════ -->
    <q-dialog v-model="openDialog" persistent>
      <q-card style="min-width: 380px; border-radius: 12px">
        <q-card-section class="text-h6">Abertura de Caixa - Fundo de Maneio</q-card-section>
        <q-card-section class="q-pt-none">
          <!-- Folha de Contagem de Caixa (MT): Denominação | Quantidade | Subtotal -->
          <FolhaContagem
            v-model="openForm.denominations"
            title="Folha de Contagem de Caixa"
            total-label="Total calculado automaticamente"
            hint="Conte o fundo de maneio nota a nota e moeda a moeda — o total é calculado automaticamente."
          />
          <div class="text-caption text-grey-6 q-mt-xs">
            <q-icon name="info" size="13px" class="q-mr-xs" />O caixa abre sempre com saldo ZERO disponível — o valor contado é apenas o fundo de maneio (memorando da gaveta, não é saldo nem arrasta para o dia seguinte).
          </div>
          <div class="text-caption text-grey-6">
            O saldo bancário consolidado não precisa de ser aberto — é reflectido automaticamente
            a partir dos saldos reais das contas.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Confirmar Abertura" :loading="saving" @click="submitOpen" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: NOVO MOVIMENTO MANUAL ═══════════ -->
    <q-dialog v-model="movementDialog" persistent>
      <q-card style="min-width: 440px; border-radius: 12px">
        <q-card-section class="text-h6">
          {{ movementForm.type === 'ENTRADA' ? 'Nova Entrada Manual' : 'Nova Saída Manual' }}
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-select
            v-model="movementForm.payment_method"
            :options="paymentMethodOptions"
            outlined
            dense
            emit-value
            map-options
            label="Método *"
            :rules="[v => !!v || 'Seleccione o método']"
          />
          <q-select
            v-if="needsBankAccount"
            v-model="movementForm.bank_account_id"
            :options="activeAccountOptions"
            outlined
            dense
            emit-value
            map-options
            label="Conta bancária *"
            :rules="[v => !!v || 'Seleccione a conta']"
          />
          <q-select
            v-model="movementForm.category"
            :options="manualCategoryOptions"
            outlined
            dense
            emit-value
            map-options
            label="Categoria *"
            :rules="[v => !!v || 'Seleccione a categoria']"
          />
          <q-input
            v-model.number="movementForm.amount"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor *"
            :rules="[v => (v !== null && v !== '' && v > 0) || 'Informe um valor maior que zero']"
          />
          <q-input
            v-model="movementForm.description"
            outlined
            dense
            type="textarea"
            rows="2"
            label="Descrição *"
            hint="Ex.: Internet mensal do escritório"
            :rules="[v => !!(v && v.trim().length >= 3) || 'A descrição é obrigatória (mín. 3 caracteres)']"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            :color="movementForm.type === 'ENTRADA' ? 'positive' : 'negative'"
            :label="movementForm.type === 'ENTRADA' ? 'Registar Entrada' : 'Registar Saída'"
            :loading="saving"
            @click="submitMovement"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: DEPOSITAR NO BANCO (CASH → BANK) ═══════════ -->
    <q-dialog v-model="depositDialog" persistent>
      <q-card style="min-width: 400px; border-radius: 12px">
        <q-card-section class="text-h6">Depositar no Banco</q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <div class="text-caption text-grey-6">
            Sai dinheiro físico da gaveta (SAÍDA CASH) e entra na conta bancária (ENTRADA BANK).
          </div>
          <q-select
            v-model="depositForm.to_account_id"
            :options="activeAccountOptions"
            outlined
            dense
            emit-value
            map-options
            label="Conta de destino *"
            :rules="[v => !!v || 'Seleccione a conta']"
          />
          <q-input
            v-model.number="depositForm.amount"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor *"
            :rules="[v => (v !== null && v !== '' && v > 0) || 'Informe um valor maior que zero']"
            autofocus
          />
          <q-input v-model="depositForm.description" outlined dense label="Descrição (opcional)" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Depositar" :loading="saving" @click="submitDeposit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: LEVANTAR DO BANCO (BANK → CASH) ═══════════ -->
    <q-dialog v-model="withdrawDialog" persistent>
      <q-card style="min-width: 400px; border-radius: 12px">
        <q-card-section class="text-h6">Levantar do Banco</q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <div class="text-caption text-grey-6">
            Sai dinheiro da conta bancária (SAÍDA BANK, valida saldo) e entra na gaveta (ENTRADA CASH).
          </div>
          <q-select
            v-model="withdrawForm.from_account_id"
            :options="activeAccountOptions"
            outlined
            dense
            emit-value
            map-options
            label="Conta de origem *"
            :rules="[v => !!v || 'Seleccione a conta']"
          />
          <q-input
            v-model.number="withdrawForm.amount"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor *"
            :rules="[v => (v !== null && v !== '' && v > 0) || 'Informe um valor maior que zero']"
            autofocus
          />
          <q-input v-model="withdrawForm.description" outlined dense label="Descrição (opcional)" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Levantar" :loading="saving" @click="submitWithdraw" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: FECHAR CAIXA DO SISTEMA (portal) ═══════════ -->
    <q-dialog v-model="systemCloseDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">Fechar Caixa do Sistema</q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-caption text-grey-6 q-mb-sm">
            Este caixa agrupa apenas <strong>pagamentos electrónicos do portal</strong>
            recebidos fora de expediente. Não há dinheiro físico — o valor contado
            esperado é <strong>0 MZN</strong>.
            <template v-if="systemRegister">
              · Entradas banco: {{ formatMZN(systemRegister.total_bank_in) }} ·
              Saídas banco: {{ formatMZN(systemRegister.total_bank_out) }}
            </template>
          </div>
          <q-input
            v-model.number="systemCloseForm.closing_balance_informed"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor contado (0 = sem dinheiro físico) *"
            :rules="[v => (v !== null && v !== '' && v >= 0) || 'Informe o valor contado >= 0']"
            autofocus
          />
          <q-input v-model="systemCloseForm.notes" outlined dense type="textarea" rows="2" label="Observações (opcional)" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="purple"
            icon="lock"
            label="Reconciliar e Fechar"
            :loading="saving"
            :disable="systemCloseForm.closing_balance_informed === null || systemCloseForm.closing_balance_informed === ''"
            @click="submitSystemClose"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: JUSTIFICAR DIFERENÇA DE CAIXA (ADMIN) ═══════════ -->
    <q-dialog v-model="justifyDialog" persistent>
      <q-card style="min-width: 460px; border-radius: 12px">
        <q-card-section class="text-h6">Justificar diferença de caixa</q-card-section>
        <q-card-section class="q-pt-none">
          <div v-if="justifyTarget" class="q-pa-sm rounded-borders bg-grey-2 q-mb-md">
            <div class="text-body2">
              <strong>{{ justifyTarget.tipo_label || justifyTarget.tipo }}</strong> de
              <strong>{{ formatMZN(justifyTarget.valor) }}</strong> no caixa #{{ justifyTarget.cashRegisterId }}
              ({{ justifyTarget.data_caixa ? formatDay(justifyTarget.data_caixa) : '—' }})
            </div>
            <div class="text-caption text-grey-7">
              Operador: {{ justifyTarget.userName }} ·
              numerário contado: {{ formatMZN(justifyTarget.valor_contado) }} ·
              saldo apurado: {{ formatMZN(justifyTarget.valor_apurado) }}
            </div>
          </div>

          <div class="text-caption text-grey-7 q-mb-sm">
            A justificação documenta o <strong>auto de ocorrência</strong> e o valor passa a constar do
            Livro Caixa na conta <strong>58 — Quebras de Caixa</strong>.
          </div>

          <q-input
            v-model="justifyForm.justificacao"
            outlined
            dense
            type="textarea"
            rows="3"
            label="Justificação (auto de ocorrência) *"
            hint="Descreva o que aconteceu com o numerário — mínimo 10 caracteres."
            :rules="[v => !!(v && v.trim().length >= 10) || 'Mínimo 10 caracteres']"
            autofocus
          />
          <q-input
            v-model="justifyForm.conta_contabilistica"
            outlined
            dense
            label="Conta contabilística"
            hint="Por omissão 58 — Quebras de Caixa"
            class="q-mt-sm"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="gavel"
            label="Justificar e lançar"
            :loading="saving"
            :disable="!justifyForm.justificacao || justifyForm.justificacao.trim().length < 10"
            @click="submitJustification"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: FECHAR CAIXA (CONFERÊNCIA CEGA por denominação) ═══════════ -->
    <q-dialog v-model="closeDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">Folha de Contagem de Fecho - Conferência Cega</q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-pa-sm rounded-borders bg-blue-1 q-mb-sm">
            <div class="text-caption text-grey-8">
              <q-icon name="info" size="14px" class="q-mr-xs" />
              Conte apenas o <strong>dinheiro físico na gaveta</strong>, nota a nota e moeda a
              moeda — os pagamentos electrónicos (M-Pesa, transferências) ficam nas contas
              bancárias e não afectam a contagem. Só vê o <strong>total contado</strong> por si;
              a diferença é apurada no backend.
            </div>
          </div>

          <!-- Folha de Contagem de Fecho (MT): Denominação | Quantidade | Subtotal.
               Só o TOTAL contado é mostrado — nunca a diferença nem o saldo. -->
          <FolhaContagem
            v-model="closeForm.denominations"
            title="Folha de Contagem de Fecho"
            total-label="Total contado"
            hint="Conferência cega: conte apenas o dinheiro físico da gaveta, nota a nota e moeda a moeda."
          />

          <q-select
            v-model="closeForm.tipo_fechamento"
            :options="closingTypeOptions"
            outlined
            dense
            emit-value
            map-options
            label="Tipo de fecho"
            class="q-mt-md"
          />

          <q-input v-model="closeForm.notes" outlined dense type="textarea" rows="2" label="Observações (opcional)" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="negative"
            icon="lock"
            label="Confirmar Fecho"
            :loading="saving"
            @click="submitClose"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: CAIXA CERTO (diferença = 0) ═══════════ -->
    <q-dialog v-model="closeResultDialog" persistent>
      <q-card style="min-width: 380px; border-radius: 12px">
        <q-card-section class="text-h6">Caixa Certo - Gerar Mapa Diário</q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-body2">
            <q-icon name="check_circle" color="positive" size="20px" class="q-mr-xs" />
            A contagem confirma o valor do caixa — sem quebra nem sobra.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Concluir" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="print"
            label="Imprimir Mapa Diário de Caixa - Modelo BM"
            @click="printFromDialog"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: AUTO DE OCORRÊNCIA - DIFERENÇA DE CAIXA ═══════════ -->
    <q-dialog v-model="autoDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">Auto de Ocorrência - Diferença de Caixa</q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <div class="q-pa-sm rounded-borders" :class="autoForm.quebra ? 'bg-red-2' : 'bg-amber-2'">
            <div class="text-body2">
              <strong>{{ autoForm.quebra ? 'Valor da Quebra (falta)' : 'Valor da Sobra (excesso)' }}:</strong>
              {{ formatMZN(autoForm.valor) }}
            </div>
            <div class="text-caption text-grey-8 q-mt-xs">
              Fica gerado o movimento <strong>DIFERENCA_CAIXA</strong> — pendente de validação
              pelo Administrador e de lançamento no Livro Caixa (conta 58 — Quebras de Caixa).
            </div>
          </div>
          <q-input
            v-model="autoForm.observacao"
            outlined
            dense
            type="textarea"
            rows="3"
            label="Observação / Justificação *"
            hint="Obrigatória — descreva o que aconteceu na gaveta (mín. 10 caracteres)"
            :rules="[v => !!(v && v.trim().length >= 10) || 'A Observação / Justificação é obrigatória (mín. 10 caracteres)']"
            :disable="autoRegistered"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-if="!autoRegistered"
            unelevated
            no-caps
            color="negative"
            icon="assignment"
            label="Registar Auto de Ocorrência"
            :loading="saving"
            @click="submitAutoObservacao"
          />
          <template v-else>
            <q-btn flat no-caps label="Concluir" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="print"
              label="Imprimir Mapa Diário de Caixa - Modelo BM"
              @click="printFromDialog"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { format, parseISO } from 'date-fns'
// Folha de Contagem de Caixa (MT) — componente oficial de contagem por
// denominação (Denominação | Quantidade | Subtotal), partilhado com o Caixa do operador.
import FolhaContagem from '@/components/caixa/FolhaContagem.vue'
import { emptyDenominationCount, sumDenominations, isEmptyDenominations } from '@/utils/mznDenominations'

/**
 * CAIXA CENTRAL DO DIA — página principal da tesouraria.
 * 6 cards (cash/bank separados) + tabs de movimentos e contas + depósitos/
 * levantamentos + fecho com divergência em tempo real.
 */
const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

// ─── Estado ───
const loading = ref(false)
const saving = ref(false)
const register = ref(null)       // caixa de hoje (aberto ou fechado)
const movements = ref([])
const accounts = ref([])

// ─── CAIXA DO SISTEMA (portal fora de expediente) ───
const systemRegister = ref(null)
const showSystemMovements = ref(false)
const tab = ref('movimentos')
const today = new Date().toISOString().slice(0, 10)

const isOpen = computed(() => !!register.value && register.value.status === 'ABERTO')

// ─── Formatação ───
function formatMZN(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

function formatDay(dateStr) {
  try {
    return format(parseISO(String(dateStr).slice(0, 10)), 'dd/MM/yyyy')
  } catch { return dateStr }
}

function formatTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'HH:mm')
  } catch { return '—' }
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
  } catch { return '—' }
}

// ─── Cards de resumo (6) ───
// FUNDO DE MANEIO contado na abertura (memorando físico — não é saldo).
// O saldo DISPONÍVEL do caixa (`opening_balance`) é sempre 0 na abertura.
const fundoMemo = computed(() => {
  const r = register.value
  if (!r) return 0
  const counted = r.counted_open
  return round2(Number(counted != null ? counted : r.opening_balance) || 0)
})

const cashBalance = computed(() => {
  if (!register.value) return 0
  const r = register.value
  return round2(fundoMemo.value + (Number(r.total_cash_in) || 0) - (Number(r.total_cash_out) || 0))
})

const consolidatedBalance = computed(() => {
  if (!register.value) return 0
  const r = register.value
  return round2((Number(r.opening_balance) || 0) + (Number(r.total_in) || 0) - (Number(r.total_out) || 0))
})

// Movimento electrónico do dia (entradas − saídas bancárias/móveis) —
// mostrado no fecho para separar a gaveta física do dinheiro nas contas.
const electronicBalance = computed(() => {
  if (!register.value) return 0
  const r = register.value
  return round2((Number(r.total_bank_in) || 0) - (Number(r.total_bank_out) || 0))
})

const summaryCards = computed(() => {
  const r = register.value || {}
  return [
    { label: 'Saldo Inicial (Fundo de Maneio)', value: fundoMemo.value, class: 'text-grey-9' },
    { label: 'Entradas Cash (gaveta)', value: r.total_cash_in || 0, class: 'text-positive' },
    { label: 'Saídas Cash (gaveta)', value: r.total_cash_out || 0, class: 'text-negative' },
    { label: 'Entradas Banco/Móvel', value: r.total_bank_in || 0, class: 'text-positive' },
    { label: 'Saídas Banco/Móvel', value: r.total_bank_out || 0, class: 'text-negative' },
    { label: 'Saldo Consolidado (cash + banco)', value: consolidatedBalance.value, class: 'text-primary' }
  ]
})

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100

// ─── Métodos de pagamento ───
const methodMeta = {
  CASH:  { label: 'CASH',  color: 'orange' },
  BANK:  { label: 'BANK',  color: 'green' },
  MPESA: { label: 'MPESA', color: 'red-7' },
  EMOLA: { label: 'EMOLA', color: 'pink-7' }
}
const methodLabel = (m) => methodMeta[m]?.label || m || '—'
const methodColor = (m) => methodMeta[m]?.color || 'grey'

const paymentMethodOptions = [
  { label: 'Dinheiro físico (CASH)', value: 'CASH' },
  { label: 'Transferência bancária', value: 'BANK' },
  { label: 'M-Pesa', value: 'MPESA' },
  { label: 'e-Mola', value: 'EMOLA' }
]

// ─── Categorias ───
// Tipos OFICIAIS de tesouraria (contabilidade moçambicana — não usar
// "sangria"/"suprimento"): entrega ao cofre, reforço de caixa, depósito
// bancário do excedente e diferença de caixa (auto de ocorrência do fecho).
const categoryMeta = {
  DESEMBOLSO:        { label: 'Desembolso',        color: 'deep-orange' },
  REEMBOLSO:         { label: 'Reembolso',         color: 'green' },
  JUROS_MORA:        { label: 'Juros Mora',        color: 'amber-8' },
  TAXA_ADMIN:        { label: 'Taxa Admin',        color: 'blue-grey' },
  ENTREGA_COFRE:     { label: 'Entrega ao Cofre',  color: 'indigo' },
  REFORCO_CAIXA:     { label: 'Reforço de caixa',  color: 'teal' },
  DEPOSITO_BANCARIO: { label: 'Depósito bancário', color: 'blue' },
  DIFERENCA_CAIXA:   { label: 'Diferença de caixa', color: 'red-7' },
  DEPOSITO_BANCO:    { label: 'Depósito Banco',    color: 'indigo' },
  LEVANTAMENTO_BANCO:{ label: 'Levantamento',      color: 'purple' },
  TRANSFERENCIA:     { label: 'Transferência',     color: 'cyan-8' },
  INTERNET:          { label: 'Internet',          color: 'indigo' },
  LUZ:               { label: 'Luz',               color: 'orange' },
  AGUA:              { label: 'Água',              color: 'light-blue' },
  COMBUSTIVEL:       { label: 'Combustível',       color: 'brown' },
  RENTABILIDADE:     { label: 'Rentabilidade',     color: 'teal' },
  SALARIOS:          { label: 'Salários',          color: 'purple' },
  SALARIO:           { label: 'Salário',           color: 'purple' },
  REUNIAO:           { label: 'Reunião',           color: 'pink' },
  TRANSPORTE:        { label: 'Transporte',        color: 'cyan-8' },
  MATERIAL:          { label: 'Material',          color: 'brown' },
  OUTROS:            { label: 'Outros',            color: 'grey' }
}
const categoryLabel = (c) => categoryMeta[c]?.label || c
const categoryColor = (c) => categoryMeta[c]?.color || 'grey'

const AUTOMATIC_CATEGORIES = ['DESEMBOLSO', 'REEMBOLSO', 'JUROS_MORA', 'TAXA_ADMIN']
// A diferença de caixa é um AUTO DE OCORRÊNCIA: nasce no fecho do caixa e é
// justificada pelo Admin (conta 58x) — nunca lançada à mão no formulário.
const NON_MANUAL_CATEGORIES = [...AUTOMATIC_CATEGORIES, 'DIFERENCA_CAIXA']
const manualCategoryOptions = Object.entries(categoryMeta)
  .filter(([key]) => !NON_MANUAL_CATEGORIES.includes(key))
  .map(([value, meta]) => ({ label: meta.label, value }))

// ─── Contas bancárias ───
async function fetchAccounts() {
  try {
    const { data } = await api.get('/api/bank-accounts')
    if (data.success) accounts.value = data.result || []
  } catch (error) {
    console.error('Erro ao carregar contas:', error)
  }
}

const activeAccountOptions = computed(() =>
  accounts.value
    .filter(acc => Number(acc.is_active) === 1)
    .map(acc => ({
      label: `${acc.bank_name || 'Conta'} - ${acc.accountNumber} - Saldo: ${formatMZN(acc.balance)}`,
      value: acc.id
    }))
)

function accountLabelFor(movement) {
  if (!movement.paymentMethod || movement.paymentMethod === 'CASH') return '—'
  const acc = accounts.value.find(a => a.id === Number(movement.bankAccountId))
  return acc ? `${acc.bank_name} ${String(acc.accountNumber).slice(-4)}` : `Conta #${movement.bankAccountId}`
}

// ─── Tabela de movimentos ───
const pagination = ref({ page: 1, rowsPerPage: 25 })
const methodFilter = ref(null)
const methodFilterOptions = [
  { label: 'Todos', value: null },
  ...Object.entries(methodMeta).map(([value, meta]) => ({ label: meta.label, value }))
]

const filteredMovements = computed(() =>
  methodFilter.value
    ? movements.value.filter(m => m.paymentMethod === methodFilter.value)
    : movements.value
)

const columns = [
  { name: 'time', label: 'Hora', field: 'createdAt', align: 'center' },
  { name: 'method', label: 'Método', field: 'paymentMethod', align: 'center' },
  { name: 'category', label: 'Categoria', field: 'category', align: 'center' },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left' },
  { name: 'account', label: 'Conta Bancária', field: 'bankAccountId', align: 'center' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'user', label: 'Utilizador', field: 'createdByName', align: 'center' },
  { name: 'comprovativo', label: 'Comprovativo', field: () => '', align: 'center' }
]

const accountColumns = [
  { name: 'bank', label: 'Banco / Número', field: 'bank_name', align: 'left' },
  { name: 'purpose', label: 'Finalidade', field: 'purpose', align: 'center' },
  { name: 'balance', label: 'Saldo', field: 'balance', align: 'right' },
  { name: 'active', label: 'Estado', field: 'is_active', align: 'center' }
]

// ─── Tabela de diferenças de caixa (quebras / sobras) ───
const differenceColumns = [
  { name: 'dia', label: 'Dia', field: 'data_caixa', align: 'center' },
  { name: 'operador', label: 'Operador', field: 'userName', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'center' },
  { name: 'valor', label: 'Valor', field: 'valor', align: 'right', sortable: true },
  { name: 'contado', label: 'Contado', field: 'valor_contado', align: 'right' },
  { name: 'apurado', label: 'Apurado', field: 'valor_apurado', align: 'right' },
  { name: 'conta', label: 'Conta', field: 'conta_label', align: 'center' },
  { name: 'estado', label: 'Estado', field: 'status', align: 'center' },
  { name: 'justificacao', label: 'Auto de ocorrência', field: 'justificacao', align: 'left' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

// ─── API: caixa de hoje ───
async function fetchToday() {
  loading.value = true
  try {
    const { data } = await api.get('/api/cash-registers/today')
    if (data.success) {
      register.value = data.result.register
      movements.value = data.result.register?.movements || []
    }
  } catch (error) {
    console.error('Erro ao carregar caixa de hoje:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar caixa', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ─── API: Caixa do Sistema (portal) ───
async function fetchSystemRegister() {
  try {
    const { data } = await api.get('/api/cash-registers/system-register')
    systemRegister.value = data.success ? data.result : null
  } catch (error) {
    console.error('Erro ao carregar Caixa do Sistema:', error)
    systemRegister.value = null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFERENÇAS DE CAIXA (QUEBRAS / SOBRAS) — CONTROLO DO ADMIN
// ─────────────────────────────────────────────────────────────────────────────
const differences = ref([])
const loadingDifferences = ref(false)
const differenceFilter = ref('PENDENTE')
const differenceFilterOptions = [
  { label: 'Pendentes', value: 'PENDENTE' },
  { label: 'Justificadas e lançadas', value: 'JUSTIFICADA' },
  { label: 'Todas', value: null }
]
const differenceSummary = ref({
  total: 0,
  pendentes: 0,
  valor_pendente: 0,
  conta_contabilistica: '58 — Quebras de Caixa'
})

// Número de diferenças pendentes — alimenta o badge do separador.
const pendingDifferencesCount = computed(() => Number(differenceSummary.value.pendentes) || 0)

// ─── Painel de tesouraria (Admin): excedentes do limite + diferenças por operador ───
const treasuryPanel = ref({ limite: null, summary: null, excedentes: [], diferencas_por_operador: [] })

const excessColumns = [
  { name: 'operador', label: 'Operador', field: 'userName', align: 'left' },
  { name: 'data', label: 'Dia', field: 'opening_date', align: 'center' },
  { name: 'dinheiro', label: 'Dinheiro em gaveta', field: 'dinheiro_em_caixa', align: 'right' },
  { name: 'limite', label: 'Limite', field: 'cash_limit_mzn', align: 'right' },
  { name: 'excedente', label: 'Excedente', field: 'excedente', align: 'right', sortable: true }
]

const treasuryDiffColumns = [
  { name: 'operador', label: 'Operador', field: 'userName', align: 'left' },
  { name: 'pendentes', label: 'Nº pendentes', field: 'total_pendentes', align: 'center', sortable: true },
  { name: 'quebras', label: 'Quebras', field: 'quebras', align: 'center' },
  { name: 'sobras', label: 'Sobras', field: 'sobras', align: 'center' },
  { name: 'valor', label: 'Valor pendente', field: 'valor_pendente', align: 'right', sortable: true },
  { name: 'ultima', label: 'Última ocorrência', field: 'ultima_data', align: 'center' }
]

async function fetchTreasuryPanel() {
  try {
    const { data } = await api.get('/api/cash-registers/treasury-panel')
    if (data.success) treasuryPanel.value = data.result
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar o painel de tesouraria',
      position: 'top'
    })
  }
}

/**
 * Carrega as diferenças de caixa. O contador de PENDENTES é sempre buscado
 * (mesmo com o filtro "Justificadas"), para o badge não mentir.
 */
async function fetchDifferences() {
  loadingDifferences.value = true
  try {
    const filtered = await api.get('/api/cash-registers/differences', {
      params: differenceFilter.value ? { status: differenceFilter.value } : {}
    })
    if (filtered.data?.success) {
      differences.value = filtered.data.result || []
      differenceSummary.value = filtered.data.summary || differenceSummary.value
    }

    if (differenceFilter.value !== 'PENDENTE') {
      const pendentes = await api.get('/api/cash-registers/differences', {
        params: { status: 'PENDENTE' }
      })
      if (pendentes.data?.success) {
        differenceSummary.value = pendentes.data.summary || differenceSummary.value
      }
    }
  } catch (error) {
    console.error('Erro ao carregar diferenças de caixa:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar as diferenças de caixa',
      position: 'top'
    })
  } finally {
    loadingDifferences.value = false
  }
}

// ─── Dialog: justificar e lançar a diferença no Livro Caixa (conta 58x) ───
const justifyDialog = ref(false)
const justifyTarget = ref(null)
const justifyForm = ref({ justificacao: '', conta_contabilistica: '58' })

function openJustifyDialog(row) {
  justifyTarget.value = row
  justifyForm.value = { justificacao: '', conta_contabilistica: '58' }
  justifyDialog.value = true
}

async function submitJustification() {
  const target = justifyTarget.value
  const justificacao = (justifyForm.value.justificacao || '').trim()
  if (!target || justificacao.length < 10) {
    $q.notify({ type: 'warning', message: 'A justificação é obrigatória (mínimo 10 caracteres)', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/differences/${target.id}/justify`, {
      justificacao,
      conta_contabilistica: justifyForm.value.conta_contabilistica || undefined
    })
    if (data.success) {
      $q.notify({
        type: 'positive',
        message: data.message || 'Diferença justificada e lançada na conta 58 — Quebras de Caixa.',
        position: 'top'
      })
      justifyDialog.value = false
      justifyTarget.value = null
      await fetchDifferences()
    }
  } catch (error) {
    const status = error.response?.status
    const message = status === 403
      ? 'Apenas o Administrador da empresa pode justificar e lançar diferenças de caixa.'
      : (error.response?.data?.message || 'Erro ao justificar a diferença de caixa')
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Dialog: abrir caixa ───
// O caixa abre sempre com SALDO ZERO DISPONÍVEL — sem sugestão de saldo
// inicial (o valor do fecho anterior não é arrastado).
const openDialog = ref(false)
const openForm = ref({ denominations: emptyDenominationCount() })

function openOpenDialog() {
  openForm.value = { denominations: emptyDenominationCount() }
  openDialog.value = true
}

async function submitOpen() {
  if (isEmptyDenominations(openForm.value.denominations)) {
    $q.notify({ type: 'warning', message: 'Conte o fundo de maneio por denominação (notas e moedas)', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post('/api/cash-registers/open', {
      denominations: openForm.value.denominations
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Caixa aberto com sucesso!', position: 'top' })
      openDialog.value = false
      await Promise.all([fetchToday(), fetchAccounts()])
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao abrir caixa', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Dialog: movimento manual ───
const movementDialog = ref(false)
const movementForm = ref({ type: 'ENTRADA', category: null, amount: null, description: '', payment_method: 'CASH', bank_account_id: null })

const needsBankAccount = computed(() => movementForm.value.payment_method && movementForm.value.payment_method !== 'CASH')

function openMovementDialog(type) {
  movementForm.value = { type, category: null, amount: null, description: '', payment_method: 'CASH', bank_account_id: null }
  movementDialog.value = true
}

// OPERAÇÕES OFICIAIS DE TESOURARIA (terminologia BM) — 3 botões do rodapé.
const TREASURY_OPERATIONS = [
  {
    category: 'ENTREGA_COFRE',
    type: 'SAIDA',
    icon: 'savings',
    label: 'Entrega de Valores ao Cofre Central',
    hint: 'Entrega do excedente ao Tesoureiro/Cofre Central — comprovativo assinado'
  },
  {
    category: 'REFORCO_CAIXA',
    type: 'ENTRADA',
    icon: 'request_quote',
    label: 'Requisição de Reforço de Caixa',
    hint: 'Pedido de fundo de maneio do Cofre para o guichê'
  },
  {
    category: 'DEPOSITO_BANCARIO',
    type: 'SAIDA',
    icon: 'account_balance',
    label: 'Guia de Depósito Bancário',
    hint: 'Registo de depósito do excedente no banco/M-Pesa (guia de depósito)'
  }
]

// Busca de uma operação oficial por categoria (botões do rodapé e do limite).
const treasuryOp = (category) => TREASURY_OPERATIONS.find((op) => op.category === category)

// Dialog de movimento com a categoria oficial pré-seleccionada.
function openTreasuryDialog(operation) {
  movementForm.value = {
    type: operation.type,
    category: operation.category,
    amount: null,
    description: '',
    payment_method: 'CASH',
    bank_account_id: null
  }
  movementDialog.value = true
}

async function submitMovement() {
  const form = movementForm.value
  if (!form.category || !form.amount || form.amount <= 0 || !form.description?.trim()) {
    $q.notify({ type: 'warning', message: 'Preencha categoria, valor e descrição', position: 'top' })
    return
  }
  if (form.payment_method !== 'CASH' && !form.bank_account_id) {
    $q.notify({ type: 'warning', message: 'Seleccione a conta bancária', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/${register.value.id}/movements`, {
      type: form.type,
      category: form.category,
      amount: form.amount,
      description: form.description.trim(),
      payment_method: form.payment_method,
      bank_account_id: form.payment_method !== 'CASH' ? form.bank_account_id : null
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Movimento registado!', position: 'top' })
      movementDialog.value = false
      await Promise.all([fetchToday(), fetchAccounts()])
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao registar movimento', position: 'top' })
  } finally {
    saving.value = false
  }
}

// Comprovativo de Entrega de Valores ao Cofre Central — documento PDF próprio
// (A4) com selo electrónico (hash SHA-256) e QR de validação pública.
async function downloadComprovativo(movement) {
  try {
    const response = await api.get(`/api/cash-movements/${movement.id}/comprovativo`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `comprovativo-entrega-cofre-${movement.id}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 30000)
    $q.notify({ type: 'positive', message: 'Comprovativo de entrega gerado (PDF + QR)', position: 'top' })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao gerar o comprovativo de entrega',
      position: 'top'
    })
  }
}

// ─── Dialog: depósito no banco ───
const depositDialog = ref(false)
const depositForm = ref({ to_account_id: null, amount: null, description: '' })

async function submitDeposit() {
  const form = depositForm.value
  if (!form.to_account_id || !form.amount || form.amount <= 0) {
    $q.notify({ type: 'warning', message: 'Preencha conta e valor', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post('/api/bank-accounts/deposit', {
      to_account_id: form.to_account_id,
      amount: form.amount,
      description: form.description || undefined
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Depósito registado!', position: 'top' })
      depositDialog.value = false
      depositForm.value = { to_account_id: null, amount: null, description: '' }
      await Promise.all([fetchToday(), fetchAccounts()])
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro no depósito', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Dialog: levantamento do banco ───
const withdrawDialog = ref(false)
const withdrawForm = ref({ from_account_id: null, amount: null, description: '' })

async function submitWithdraw() {
  const form = withdrawForm.value
  if (!form.from_account_id || !form.amount || form.amount <= 0) {
    $q.notify({ type: 'warning', message: 'Preencha conta e valor', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post('/api/bank-accounts/transfer', {
      from_account_id: form.from_account_id,
      to_cash_register_id: register.value.id,
      amount: form.amount,
      description: form.description || undefined
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Levantamento registado!', position: 'top' })
      withdrawDialog.value = false
      withdrawForm.value = { from_account_id: null, amount: null, description: '' }
      await Promise.all([fetchToday(), fetchAccounts()])
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro no levantamento', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Dialog: fechar caixa (CONFERÊNCIA CEGA por denominação) ───
// O operador conta fisicamente; só vê o TOTAL contado — a diferença é apurada
// no backend e nunca é mostrada durante a contagem.
const closeDialog = ref(false)
const closeForm = ref({ denominations: emptyDenominationCount(), tipo_fechamento: 'NORMAL', notes: '' })
const closingTypeOptions = [
  { value: 'NORMAL', label: 'Fecho normal (sem divergência)' },
  { value: 'ENTREGA_COFRE', label: 'Fecho com entrega do excedente ao Cofre' },
  { value: 'DEPOSITO_BANCARIO', label: 'Fecho com depósito do excedente no banco' }
]

// ─── Pós-fecho (conferência cega): resultado apresentado ao operador ───
const closeResultDialog = ref(false)   // "Caixa Certo - Gerar Mapa Diário"
const autoDialog = ref(false)          // "Auto de Ocorrência - Diferença de Caixa"
const autoRegistered = ref(false)      // observação do operador já submetida
const autoForm = ref({ quebra: true, valor: 0, observacao: '' })
// Auto de ocorrência criado no fecho (diferenca_pendente da resposta).
const pendingDifference = ref(null)

function openCloseDialog() {
  closeForm.value = { denominations: emptyDenominationCount(), tipo_fechamento: 'NORMAL', notes: '' }
  closeDialog.value = true
}

async function submitClose() {
  if (isEmptyDenominations(closeForm.value.denominations)) {
    // Gaveta vazia: confirmar antes de enviar a contagem a zero.
    $q.dialog({
      title: 'Confirmar contagem a zero',
      message: 'Não contou nenhuma nota nem moeda. Confirma que a gaveta está vazia?',
      cancel: true,
      persistent: true
    }).onOk(() => postClose())
    return
  }
  await postClose()
}

async function postClose() {
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/${register.value.id}/close`, {
      denominations: closeForm.value.denominations,
      tipo_fechamento: closeForm.value.tipo_fechamento,
      notes: closeForm.value.notes || undefined
    })
    if (data.success) {
      const diff = Number(data.result?.difference) || 0
      pendingDifference.value = data.result?.diferenca_pendente || null
      closeDialog.value = false
      await Promise.all([fetchToday(), fetchDifferences()])
      if (Math.abs(diff) < 0.01) {
        // CAIXA CERTO — a contagem confirma o valor do caixa.
        $q.notify({ type: 'positive', message: 'Caixa Certo - Gerar Mapa Diário', position: 'top' })
        closeResultDialog.value = true
      } else {
        // AUTO DE OCORRÊNCIA — a Observação / Justificação do operador é OBRIGATÓRIA.
        autoForm.value = { quebra: diff < 0, valor: Math.abs(diff), observacao: '' }
        autoRegistered.value = false
        autoDialog.value = true
      }
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao fechar caixa', position: 'top' })
  } finally {
    saving.value = false
  }
}

// Auto de Ocorrência: observação/justificação OBRIGATÓRIA do operador — vai para
// o auto (cash_differences), que fica PENDENTE até o Admin justificar e lançar
// no Livro Caixa (conta 58 — Quebras de Caixa).
async function submitAutoObservacao() {
  const obs = (autoForm.value.observacao || '').trim()
  if (obs.length < 10) {
    $q.notify({ type: 'warning', message: 'A Observação / Justificação é obrigatória (mín. 10 caracteres)', position: 'top' })
    return
  }
  const id = pendingDifference.value?.id
  if (!id) {
    $q.notify({ type: 'negative', message: 'Auto de ocorrência não identificado', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/differences/${id}/observacao`, { observacao: obs })
    if (data.success) {
      autoRegistered.value = true
      $q.notify({ type: 'positive', message: 'Auto de ocorrência registado — pendente de validação pelo Administrador.', position: 'top' })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao registar o auto de ocorrência', position: 'top' })
  } finally {
    saving.value = false
  }
}

// Imprime o Mapa Diário a partir dos diálogos de resultado do fecho.
async function printFromDialog() {
  closeResultDialog.value = false
  autoDialog.value = false
  await exportPDF()
}

// ==================== EXPORTAÇÃO PDF ====================
function moneyRaw(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// PDF GERADO NO BACKEND — POST /api/reports/table-pdf (pdfkit no servidor).
// 1.º PDF: resumo + canal (Portal vs Balcão); 2.º PDF: movimentos do dia.
async function exportPDF() {
  if (movements.value.length === 0) return
  try {
    const { downloadTablePdf, tablePdfError } = await import('@/utils/tablePdf')
    const { buildMapaDiarioPayload } = await import('@/utils/mapaDiarioBM')
    const reg = register.value
    const dayLabel = formatDay(reg.opening_date)

    // Origem por movimento: Portal (Caixa do Sistema / etiqueta fora de expediente)
    // vs Balcão (cobranças presenciais dos operadores)
    const PORTAL_TAG = '[Portal — fora de expediente]'
    const isPortalMovement = (m) =>
      Boolean(m.isPortal) || String(m.description || '').includes(PORTAL_TAG)

    // ── Separação Portal vs Balcão (entradas) ──
    const totalIn = movements.value.reduce((s, m) => s + (m.type === 'ENTRADA' ? Number(m.amount) || 0 : 0), 0)
    const portalIn = movements.value.filter(isPortalMovement).reduce((s, m) => s + (m.type === 'ENTRADA' ? Number(m.amount) || 0 : 0), 0)
    const inPersonIn = round2(totalIn - portalIn)

    const channelRows = [
      ['Portal (fora de expediente)', moneyRaw(portalIn) + ' MZN', totalIn > 0 ? ((portalIn / totalIn) * 100).toFixed(1) + '%' : '—'],
      ['Balcão (presencial)', moneyRaw(inPersonIn) + ' MZN', totalIn > 0 ? ((inPersonIn / totalIn) * 100).toFixed(1) + '%' : '—'],
      ['TOTAL', moneyRaw(totalIn) + ' MZN', '100%']
    ]

    // ── MAPA DIÁRIO DE CAIXA — MODELO BM (A4, util partilhado) ──
    const mapaPayload = buildMapaDiarioPayload({
      register: reg,
      movements: movements.value,
      userName: authStore.userName || '—',
      dayLabel,
      denominations: reg.denominations_close || reg.denominations_open || null,
      extraRows: [
        ['', ''],
        ['PAGAMENTOS — PORTAL vs BALCÃO (entradas)', ''],
        ['Canal | Entradas | % do total', ''],
        ...channelRows.map(([canal, valor, pct]) => [String(canal), `${String(valor)} | ${String(pct)}`])
      ]
    })
    await downloadTablePdf(mapaPayload, `${mapaPayload.filename}.pdf`)

    await downloadTablePdf({
      title: `Mapa Diário de Caixa - Modelo BM — Movimentos (${dayLabel})`,
      meta: [`numerário +${moneyRaw(reg.total_cash_in)}/−${moneyRaw(reg.total_cash_out)} · electrónico +${moneyRaw(reg.total_bank_in)}/−${moneyRaw(reg.total_bank_out)} MZN`],
      filename: `mapa-caixa-${reg.opening_date}-central-movimentos`,
      columns: [
        { label: 'Hora', width: 50 },
        { label: 'Método', width: 65 },
        { label: 'Categoria', width: 70 },
        { label: 'Descrição' },
        { label: 'Conta', width: 60, align: 'center' },
        { label: 'Origem', width: 50, align: 'center' },
        { label: 'Valor', width: 80, align: 'right' }
      ],
      rows: movements.value.map(m => [
        formatTime(m.createdAt),
        methodLabel(m.paymentMethod),
        categoryLabel(m.category),
        m.description || '—',
        accountLabelFor(m),
        isPortalMovement(m) ? 'Portal' : 'Balcão',
        `${m.type === 'ENTRADA' ? '+' : '-'} ${moneyRaw(m.amount)} MZN`
      ])
    }, `caixa-central-${reg.opening_date}-movimentos.pdf`)

    $q.notify({ type: 'positive', message: 'Mapa Diário de Caixa gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF do caixa:', e)
    const { tablePdfError } = await import('@/utils/tablePdf')
    $q.notify({ type: 'negative', message: await tablePdfError(e, 'Erro ao gerar PDF'), position: 'top' })
  }
}

// ─── Dialog: fechar o Caixa do Sistema (reconciliação do portal) ───
const systemCloseDialog = ref(false)
const systemCloseForm = ref({ closing_balance_informed: null, notes: '' })

function openSystemCloseDialog() {
  systemCloseForm.value = { closing_balance_informed: null, notes: '' }
  systemCloseDialog.value = true
}

// Caixa do Sistema só tem dinheiro electrónico → saldo cash calculado é 0;
// o valor contado esperado no fecho é 0 (a divergência real estaria na gaveta).
const systemCashBalance = computed(() => {
  if (!systemRegister.value) return 0
  const r = systemRegister.value
  return round2((Number(r.opening_balance) || 0) + (Number(r.total_cash_in) || 0) - (Number(r.total_cash_out) || 0))
})

async function submitSystemClose() {
  const informed = Number(systemCloseForm.value.closing_balance_informed)
  if (!Number.isFinite(informed) || informed < 0) {
    $q.notify({ type: 'warning', message: 'Informe o valor contado (0 — não há dinheiro físico)', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/${systemRegister.value.id}/close`, {
      closing_balance_informed: informed,
      notes: systemCloseForm.value.notes || undefined
    })
    if (data.success) {
      $q.notify({
        type: Math.abs(Number(data.result?.difference) || 0) < 0.01 ? 'positive' : 'warning',
        message: 'Caixa do Sistema reconciliado e fechado!',
        position: 'top'
      })
      systemCloseDialog.value = false
      await fetchSystemRegister()
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao fechar o Caixa do Sistema', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Mount ───
onMounted(async () => {
  await Promise.all([fetchToday(), fetchAccounts(), fetchSystemRegister(), fetchDifferences(), fetchTreasuryPanel()])
})
</script>

<style lang="scss" scoped>
.caixa-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .caixa-page {
  background: #1a1a2e;
}
</style>
