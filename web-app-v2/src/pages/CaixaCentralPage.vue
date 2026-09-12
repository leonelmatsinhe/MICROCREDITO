<template>
  <div class="q-pa-md caixa-page">
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
                label="Fechar Caixa"
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
        <div class="row q-col-gutter-md q-mb-md">
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
            Valor contado (cash): <strong>{{ formatMZN(register.closing_balance_informed) }}</strong> ·
            Calculado (cash): <strong>{{ formatMZN(register.closing_balance_calculated) }}</strong> ·
            Divergência:
            <strong :class="Math.abs(Number(register.difference)) < 0.01 ? 'text-positive' : 'text-negative'">
              {{ formatMZN(register.difference) }}
            </strong>
          </span>
        </q-banner>

        <!-- ═══════════ TABS: MOVIMENTOS / CONTAS BANCÁRIAS ═══════════ -->
        <q-card flat bordered style="border-radius: 12px; overflow: hidden">
          <q-tabs v-model="tab" dense no-caps align="left" active-color="primary" class="text-grey-7">
            <q-tab name="movimentos" icon="receipt_long" label="Movimentos do Dia" />
            <q-tab name="bancos" icon="account_balance" label="Contas Bancárias" />
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
          </q-tab-panels>
        </q-card>
      </template>
    </template>

    <!-- ═══════════ DIALOG: ABRIR CAIXA ═══════════ -->
    <q-dialog v-model="openDialog" persistent>
      <q-card style="min-width: 380px; border-radius: 12px">
        <q-card-section class="text-h6">Abrir Caixa do Dia</q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model.number="openForm.opening_balance"
            type="number"
            outlined
            dense
            label="Saldo inicial cash (fundo de troco) *"
            prefix="MZN"
            :rules="[v => (v !== null && v !== '' && v >= 0) || 'Informe um saldo inicial >= 0']"
            autofocus
          />
          <div v-if="suggestionLabel" class="text-caption text-primary q-mt-xs">
            <q-icon name="lightbulb" size="13px" class="q-mr-xs" />{{ suggestionLabel }}
          </div>
          <div class="text-caption text-grey-6">
            O saldo bancário consolidado não precisa de ser aberto — é reflectido automaticamente
            a partir dos saldos reais das contas.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Abrir Caixa" :loading="saving" @click="submitOpen" />
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

    <!-- ═══════════ DIALOG: FECHAR CAIXA (divergência em tempo real) ═══════════ -->
    <q-dialog v-model="closeDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">Fechar Caixa</q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-pa-sm rounded-borders bg-blue-1 q-mb-sm">
            <div class="text-caption text-grey-8">
              <q-icon name="info" size="14px" class="q-mr-xs" />
              Conte apenas o <strong>dinheiro físico na gaveta</strong> — os pagamentos electrónicos (M-Pesa, transferências) ficam nas contas bancárias e não afectam a contagem.
            </div>
            <div class="row q-mt-xs q-gutter-md">
              <div>
                <div class="text-caption text-grey-6" style="font-size: 10px">Calculado (cash)</div>
                <div class="text-weight-bold text-primary">{{ formatMZN(cashBalance) }}</div>
              </div>
              <div>
                <div class="text-caption text-grey-6" style="font-size: 10px">Movimento electrónico</div>
                <div class="text-weight-bold text-grey-8">{{ formatMZN(electronicBalance) }}</div>
              </div>
              <div>
                <div class="text-caption text-grey-6" style="font-size: 10px">Saldo consolidado</div>
                <div class="text-weight-bold text-grey-8">{{ formatMZN(consolidatedBalance) }}</div>
              </div>
            </div>
          </div>
          <q-input
            v-model.number="closeForm.closing_balance_informed"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor contado em caixa (dinheiro físico) *"
            :rules="[v => (v !== null && v !== '' && v >= 0) || 'Informe o valor contado >= 0']"
            autofocus
          />
          <q-input v-model="closeForm.notes" outlined dense type="textarea" rows="2" label="Observações (opcional)" class="q-mt-sm" />

          <!-- Divergência calculada em tempo real -->
          <div
            v-if="closeForm.closing_balance_informed !== null && closeForm.closing_balance_informed !== ''"
            class="q-mt-md q-pa-sm rounded-borders"
            :class="liveDifferenceClass"
          >
            <div class="text-caption">Divergência (contado − calculado):</div>
            <div class="text-h6 text-weight-bold">{{ formatMZN(liveDifference) }}</div>
            <div class="text-caption">{{ liveDifferenceLabel }}</div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="negative"
            icon="lock"
            label="Fechar Caixa"
            :loading="saving"
            :disable="closeForm.closing_balance_informed === null || closeForm.closing_balance_informed === ''"
            @click="submitClose"
          />
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

// ─── Cards de resumo (6) ───
const cashBalance = computed(() => {
  if (!register.value) return 0
  const r = register.value
  return round2((Number(r.opening_balance) || 0) + (Number(r.total_cash_in) || 0) - (Number(r.total_cash_out) || 0))
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
    { label: 'Saldo Inicial (fundo de troco)', value: r.opening_balance || 0, class: 'text-grey-9' },
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
const categoryMeta = {
  DESEMBOLSO:        { label: 'Desembolso',        color: 'deep-orange' },
  REEMBOLSO:         { label: 'Reembolso',         color: 'green' },
  JUROS_MORA:        { label: 'Juros Mora',        color: 'amber-8' },
  TAXA_ADMIN:        { label: 'Taxa Admin',        color: 'blue-grey' },
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
const manualCategoryOptions = Object.entries(categoryMeta)
  .filter(([key]) => !AUTOMATIC_CATEGORIES.includes(key))
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
  { name: 'user', label: 'Utilizador', field: 'createdByName', align: 'center' }
]

const accountColumns = [
  { name: 'bank', label: 'Bank / Número', field: 'bank_name', align: 'left' },
  { name: 'purpose', label: 'Finalidade', field: 'purpose', align: 'center' },
  { name: 'balance', label: 'Saldo Atual', field: 'balance', align: 'right' },
  { name: 'active', label: 'Estado', field: 'is_active', align: 'center' }
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

// ─── Dialog: abrir caixa ───
const openDialog = ref(false)
const openForm = ref({ opening_balance: null })
// Sugestão de saldo inicial (valor contado no último fecho do utilizador)
const openingSuggestion = ref({ suggested: 0, source: '', previousDate: null })

// Texto amigável da origem da sugestão (auditoria transparente)
const suggestionLabel = computed(() => {
  const s = openingSuggestion.value
  if (!s || !s.source || s.source === 'primeiro-dia') return ''
  const day = s.previousDate ? formatDay(s.previousDate) : ''
  switch (s.source) {
    case 'contado-anterior':
      return `Sugerido: valor contado no fecho de ${day}`
    case 'contado-outro-operador':
      return `Sugerido: contado no fecho de ${day} (outro operador)`
    case 'calculado-anterior':
      return `Sugerido: saldo calculado do fecho de ${day}`
    case 'calculado-outro-operador':
      return `Sugerido: saldo do fecho de ${day} (outro operador)`
    default:
      return ''
  }
})

/** Busca a sugestão (chamada ao abrir o dialog). Nunca bloqueia a abertura. */
async function fetchOpeningSuggestion() {
  try {
    const { data } = await api.get('/api/cash-registers/opening-balance-suggestion')
    if (data?.success && data.result) {
      openingSuggestion.value = data.result
      // Pré-preenche com o valor contado no fecho anterior (0 no primeiro dia).
      openForm.value.opening_balance = Number(data.result.suggested) || 0
    }
  } catch {
    // silencioso — dialog abre com campo vazio e o operador preenche à mão
  }
}

function openOpenDialog() {
  openForm.value = { opening_balance: null }
  openingSuggestion.value = { suggested: 0, source: '', previousDate: null }
  openDialog.value = true
  fetchOpeningSuggestion()
}

async function submitOpen() {
  if (openForm.value.opening_balance === null || openForm.value.opening_balance === '') {
    $q.notify({ type: 'warning', message: 'Informe o saldo inicial', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post('/api/cash-registers/open', {
      opening_balance: openForm.value.opening_balance
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

// ─── Dialog: fechar caixa (divergência em tempo real) ───
const closeDialog = ref(false)
const closeForm = ref({ closing_balance_informed: null, notes: '' })

function openCloseDialog() {
  closeForm.value = { closing_balance_informed: null, notes: '' }
  closeDialog.value = true
}

const liveDifference = computed(() => {
  const informed = Number(closeForm.value.closing_balance_informed)
  if (!Number.isFinite(informed)) return 0
  return round2(informed - cashBalance.value)
})

const liveDifferenceClass = computed(() =>
  Math.abs(liveDifference.value) < 0.01 ? 'bg-green-1 text-green-9' : 'bg-amber-2 text-amber-10'
)

const liveDifferenceLabel = computed(() => {
  const diff = liveDifference.value
  if (Math.abs(diff) < 0.01) return 'Caixa fechado sem divergência.'
  return diff > 0
    ? `Excedente de ${formatMZN(diff)} — verifique se algum movimento falta registar.`
    : `Faltam ${formatMZN(Math.abs(diff))} em caixa — confirme o valor contado.`
})

async function submitClose() {
  const informed = Number(closeForm.value.closing_balance_informed)
  if (!Number.isFinite(informed) || informed < 0) {
    $q.notify({ type: 'warning', message: 'Informe o valor contado em caixa', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/${register.value.id}/close`, {
      closing_balance_informed: informed,
      notes: closeForm.value.notes || undefined
    })
    if (data.success) {
      const diff = Number(data.result?.difference) || 0
      $q.notify({
        type: Math.abs(diff) < 0.01 ? 'positive' : 'warning',
        message: Math.abs(diff) < 0.01
          ? 'Caixa fechado sem divergência!'
          : `Caixa fechado. Divergência: ${formatMZN(diff)}`,
        position: 'top',
        timeout: 5000
      })
      closeDialog.value = false
      await fetchToday()
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao fechar caixa', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ==================== EXPORTAÇÃO PDF ====================
function moneyRaw(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

async function exportPDF() {
  if (movements.value.length === 0) return
  try {
    const companyId = authStore.companyId
    if (companyId && !companyStore.hasCompany) {
      await companyStore.fetchCompany(companyId).catch(() => {})
    }
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const { buildCompanyHeader, companyLogoBase64, commonStyles, tableLayout } = await import('@/utils/pdfHeader')
    const company = companyStore.company || {}
    const logoBase64 = await companyLogoBase64(company)

    const reg = register.value
    const dayLabel = formatDay(reg.opening_date)

    const summaryRows = [
      ['Estado do caixa', reg.status === 'ABERTO' ? 'ABERTO' : 'FECHADO'],
      ['Saldo inicial (cash)', moneyRaw(reg.opening_balance) + ' MZN'],
      ['Entradas cash', moneyRaw(reg.total_cash_in) + ' MZN'],
      ['Saídas cash', moneyRaw(reg.total_cash_out) + ' MZN'],
      ['Entradas banco', moneyRaw(reg.total_bank_in) + ' MZN'],
      ['Saídas banco', moneyRaw(reg.total_bank_out) + ' MZN'],
      ['Saldo consolidado', moneyRaw(consolidatedBalance.value) + ' MZN']
    ]
    if (reg.status === 'FECHADO') {
      summaryRows.push(
        ['Valor contado (cash)', moneyRaw(reg.closing_balance_informed) + ' MZN'],
        ['Divergência', moneyRaw(reg.difference) + ' MZN' +
          (Math.abs(Number(reg.difference)) < 0.01 ? '  ✓' : '  ⚠ ATENÇÃO')]
      )
    }

    const summaryTable = {
      table: {
        widths: ['*', 'auto'],
        body: summaryRows.map(([label, value]) => ([
          { text: label, style: 'cellText' },
          { text: value, style: 'cellRightBold' }
        ]))
      },
      layout: 'grid',
      margin: [0, 0, 0, 14]
    }

    // Origem por movimento: Portal (Caixa do Sistema / etiqueta fora de expediente)
    // vs Balcão (cobranças presenciais dos operadores)
    const PORTAL_TAG = '[Portal — fora de expediente]'
    const isPortalMovement = (m) =>
      Boolean(m.isPortal) || String(m.description || '').includes(PORTAL_TAG)

    const movementRows = movements.value.map(m => ([
      { text: formatTime(m.createdAt), style: 'cellCenter' },
      { text: methodLabel(m.paymentMethod), style: 'cellCenter' },
      { text: categoryLabel(m.category), style: 'cellCenter' },
      { text: m.description || '—', style: 'cellText' },
      { text: accountLabelFor(m), style: 'cellCenter' },
      { text: isPortalMovement(m) ? 'Portal' : 'Balcão', style: 'cellCenter', color: isPortalMovement(m) ? '#6a1b9a' : '#37474f' },
      {
        text: (m.type === 'ENTRADA' ? '+ ' : '− ') + moneyRaw(m.amount) + ' MZN',
        style: m.type === 'ENTRADA' ? 'inPositive' : 'inNegative'
      }
    ]))

    const totalRow = [
      { text: 'TOTAIS', colSpan: 6, style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      {
        text: `cash +${moneyRaw(reg.total_cash_in)}/−${moneyRaw(reg.total_cash_out)} · bank +${moneyRaw(reg.total_bank_in)}/−${moneyRaw(reg.total_bank_out)}`,
        style: 'totalCellRight'
      }
    ]

    const movementHeader = [
      { text: 'Hora', style: 'tableHeader' },
      { text: 'Método', style: 'tableHeader' },
      { text: 'Categoria', style: 'tableHeader' },
      { text: 'Descrição', style: 'tableHeader' },
      { text: 'Conta', style: 'tableHeader' },
      { text: 'Origem', style: 'tableHeader' },
      { text: 'Valor', style: 'tableHeader' }
    ]

    // ── Separação Portal vs Balcão (entradas) ──
    // Portal = movimentos do Caixa do Sistema (fora de expediente). Balcão = restantes.
    const totalIn = movements.value.reduce((s, m) => s + (m.type === 'ENTRADA' ? Number(m.amount) || 0 : 0), 0)
    const portalIn = movements.value.filter(isPortalMovement).reduce((s, m) => s + (m.type === 'ENTRADA' ? Number(m.amount) || 0 : 0), 0)
    const inPersonIn = round2(totalIn - portalIn)

    const channelSection = [
      { text: 'PAGAMENTOS — PORTAL vs BALCÃO (entradas)', fontSize: 10, bold: true, color: '#1a237e', margin: [0, 8, 0, 5] },
      {
        table: {
          widths: ['*', 'auto', 'auto'],
          body: [
            [
              { text: 'Canal', style: 'cellText' },
              { text: 'Entradas', style: 'cellRightBold' },
              { text: '% do total', style: 'cellRightBold' }
            ],
            [
              { text: 'Portal (fora de expediente)', style: 'cellText', color: '#6a1b9a' },
              { text: moneyRaw(portalIn) + ' MZN', style: 'cellRightBold', color: '#6a1b9a' },
              { text: totalIn > 0 ? ((portalIn / totalIn) * 100).toFixed(1) + '%' : '—', style: 'cellRightBold' }
            ],
            [
              { text: 'Balcão (presencial)', style: 'cellText' },
              { text: moneyRaw(inPersonIn) + ' MZN', style: 'cellRightBold' },
              { text: totalIn > 0 ? ((inPersonIn / totalIn) * 100).toFixed(1) + '%' : '—', style: 'cellRightBold' }
            ],
            [
              { text: 'TOTAL', style: 'totalCell' },
              { text: moneyRaw(totalIn) + ' MZN', style: 'totalCellRight' },
              { text: '100%', style: 'totalCellRight' }
            ]
          ]
        },
        layout: 'grid',
        margin: [0, 0, 0, 14]
      }
    ]

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [24, 20, 24, 30],
      content: [
        ...buildCompanyHeader(company, logoBase64, `Caixa Central — ${dayLabel}`),
        { text: `${movements.value.length} movimento(s) · ${reg.status}`, fontSize: 8, color: '#444', margin: [0, 0, 0, 8] },
        summaryTable,
        ...channelSection,
        { text: 'MOVIMENTOS DO DIA', fontSize: 10, bold: true, color: '#1a237e', margin: [0, 0, 0, 5] },
        {
          table: {
            headerRows: 1,
            widths: [35, 40, 60, '*', 50, 40, 78],
            body: [movementHeader, ...movementRows, totalRow]
          },
          layout: tableLayout,
          fontSize: 7
        }
      ],
      styles: {
        ...commonStyles,
        inPositive: { fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
        inNegative: { fontSize: 7, alignment: 'right', bold: true, color: '#c62828' }
      },
      defaultStyle: { font: 'Roboto' }
    }

    pdfMake.createPdf(docDefinition).download(`caixa-central-${reg.opening_date}.pdf`)
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF do caixa:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
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
  await Promise.all([fetchToday(), fetchAccounts(), fetchSystemRegister()])
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
