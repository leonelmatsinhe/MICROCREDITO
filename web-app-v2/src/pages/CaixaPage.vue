<template>
  <div class="q-pa-md caixa-page" data-tour="caixa-body">
    <!-- ═══════════ CARREGAMENTO ═══════════ -->
    <div v-if="loading || !cashMode" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar caixa do dia...</div>
    </div>

    <!-- ═══════════ MODO ELECTRÓNICO MANUAL ═══════════ -->
    <!-- Reconciliação por conta bancária já existente: sem folha de contagem
         nem conferência cega de numerário. -->
    <ElectronicCashPanel v-else-if="cashMode === 'ELECTRONIC'" />

    <template v-else>
      <!-- ═══════════ SEM CAIXA HOJE: BANNER + BOTÃO ABRIR ═══════════ -->
      <q-card v-if="!register" flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="text-center q-pa-xl">
          <q-icon name="account_balance_wallet" size="64px" color="grey-5" />
          <div class="text-h6 q-mt-md">Nenhum caixa aberto hoje</div>
          <div class="text-caption text-grey-6 q-mb-lg">
            Abra o caixa do dia para registar desembolsos, pagamentos e despesas.
          </div>
          <q-btn
            color="primary"
            size="lg"
            no-caps
            unelevated
            icon="point_of_sale"
            label="Abrir Caixa do Dia"
            data-tour="caixa-abrir"
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
                Caixa de {{ formatDay(register.opening_date) }}
                <q-badge :color="isOpen ? 'positive' : 'grey'" class="q-ml-sm" align="middle">
                  {{ isOpen ? 'ABERTO' : 'FECHADO' }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-6">
                Aberto às {{ formatTime(register.createdAt) }}
                <template v-if="!isOpen"> · Fechado às {{ formatTime(register.closed_at) }}</template>
              </div>
            </div>

            <!-- ═══ CONTADOR AO VIVO: dinheiro físico na gaveta ═══ -->
            <!-- CONFERÊNCIA CEGA: escondido enquanto o fecho está aberto —
                 o operador nunca pode ver saldos durante a contagem. -->
            <div
              v-if="!closeDialog"
              class="drawer-counter gt-xs q-mr-md"
              :class="{ 'drawer-closed': !isOpen, 'flash-up': flash === 'up', 'flash-down': flash === 'down' }"
            >
              <div class="text-caption text-grey-6" style="font-size: 10px; line-height: 1.2">
                <q-icon name="account_balance_wallet" size="12px" class="q-mr-xs" />Dinheiro em caixa
              </div>
              <div class="text-weight-bolder" style="font-size: 21px; line-height: 1.15; font-variant-numeric: tabular-nums">
                {{ formatMZN(displayCash) }}
              </div>
            </div>

            <div class="row q-gutter-sm no-wrap">
              <q-btn
                flat
                no-caps
                icon="picture_as_pdf"
                label="PDF"
                :disable="movements.length === 0"
                @click="exportPDF"
              >
                <q-tooltip>Resumo do dia em PDF</q-tooltip>
              </q-btn>
              <q-btn
                flat
                no-caps
                icon="history"
                label="Histórico"
                @click="$router.push('/caixa/historico')"
              >
                <q-tooltip>Histórico e auditoria de caixas</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isOpen"
                color="negative"
                outline
                no-caps
                icon="lock"
                label="Efectuar Fecho"
                data-tour="caixa-fechar"
                @click="openCloseDialog"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- ═══════════ 4 CARDS DE RESUMO (entradas/saídas já em MZN formatado) ═══════════ -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Saldo Inicial (Fundo de Maneio)</div>
                <div class="text-h6 text-weight-bold" style="font-size: 19px">{{ formatMZN(fundoMemo) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Total Entradas</div>
                <div class="text-h6 text-weight-bold text-positive" style="font-size: 19px">{{ formatMZN(register.total_in) }}</div>
                <div class="text-caption text-grey-5" style="font-size: 10px">
                  {{ formatMZN(register.total_cash_in) }} em dinheiro · {{ formatMZN(register.total_bank_in) }} electrónico
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Total Saídas</div>
                <div class="text-h6 text-weight-bold text-negative" style="font-size: 19px">{{ formatMZN(register.total_out) }}</div>
                <div class="text-caption text-grey-5" style="font-size: 10px">
                  {{ formatMZN(register.total_cash_out) }} em dinheiro · {{ formatMZN(register.total_bank_out) }} electrónico
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Saldo Atual (consolidado)</div>
                <div class="text-h6 text-weight-bold text-primary" style="font-size: 19px">{{ formatMZN(currentBalance) }}</div>
                <div v-if="!closeDialog" class="text-caption text-grey-5" style="font-size: 10px">
                  Em dinheiro físico: <strong class="text-grey-7">{{ formatMZN(cashBalance) }}</strong>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- ═══════════ LIMITE DE NUMERÁRIO EM CAIXA (circular do BM) ═══════════ -->
        <q-banner
          v-if="!closeDialog && register.limites && register.limites.excedido"
          rounded
          class="q-mb-md bg-negative text-white"
          style="border-radius: 10px"
        >
          <template v-slot:avatar>
            <q-icon name="warning" color="white" size="26px" />
          </template>
          <div class="text-subtitle2 text-weight-bold">
            Limite de Numerário Excedido - Efectuar Entrega ao Cofre Central nos termos da Circular BM
            (limite {{ formatMZN(register.limites.cash_limit_mzn) }})
          </div>
          <div class="text-body2">
            Tem <strong>{{ formatMZN(register.limites.dinheiro_em_caixa) }}</strong> em dinheiro físico
            na gaveta — {{ formatMZN(register.limites.excedente) }} acima do limite.
            Registe uma <strong>Entrega ao Cofre</strong> (comprovativo assinado) ou um
            <strong>Depósito Bancário</strong> (guia de depósito) antes de continuar a operar.
          </div>
          <div v-if="isOpen" class="q-mt-sm row q-gutter-sm">
            <q-btn
              dense
              no-caps
              color="white"
              text-color="negative"
              icon="savings"
              label="Entrega de Valores ao Cofre Central"
              @click="openTreasuryDialog(treasuryOp('ENTREGA_COFRE'))"
            />
            <q-btn
              dense
              no-caps
              color="white"
              text-color="negative"
              icon="account_balance"
              label="Guia de Depósito Bancário"
              @click="openTreasuryDialog(treasuryOp('DEPOSITO_BANCARIO'))"
            />
          </div>
        </q-banner>

        <div v-else-if="!closeDialog && isOpen && register.limites" class="q-mb-md text-caption text-grey-7">
          <q-icon name="info" size="14px" class="q-mr-xs" />
          Limite de numerário em caixa:
          <strong>{{ formatMZN(register.limites.cash_limit_mzn) }}</strong>
          · em gaveta: <strong>{{ formatMZN(register.limites.dinheiro_em_caixa) }}</strong>
          <span v-if="register.limites.excedente > 0">
            · excedente {{ formatMZN(register.limites.excedente) }}</span>
        </div>

        <!-- ═══════════ RESULTADO DO FECHO (caixa fechado) ═══════════ -->
        <!-- Contagem CEGA: o saldo apurado pelo sistema não sai do backend —
             só o valor contado pelo operador e a diferença apurada. -->
        <q-banner
          v-if="!isOpen"
          rounded
          class="q-mb-md bg-grey-2"
          style="border-radius: 10px"
          data-tour="caixa-fecho-resultado"
        >
          <template v-slot:avatar>
            <q-icon :name="Math.abs(Number(register.difference)) < 0.01 ? 'check_circle' : 'warning'" :color="Math.abs(Number(register.difference)) < 0.01 ? 'positive' : 'warning'" />
          </template>
          <span class="text-body2">
            Valor contado pelo operador: <strong>{{ formatMZN(register.closing_balance_informed) }}</strong> ·
            Diferença apurada:
            <strong :class="Math.abs(Number(register.difference)) < 0.01 ? 'text-positive' : 'text-negative'">
              {{ formatMZN(register.difference) }}
            </strong>
            <template v-if="register.tipo_fechamento">
              · Tipo de fecho:
              <strong>{{ register.tipo_fechamento_label || register.tipo_fechamento }}</strong>
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
        </q-banner>

        <!-- DIFERENÇA DE CAIXA: auto de ocorrência pendente para o Admin -->
        <q-banner
          v-if="!isOpen && (apuredDifference || Math.abs(Number(register.difference)) >= 0.01)"
          rounded
          class="q-mb-md bg-amber-2"
          style="border-radius: 10px"
        >
          <template v-slot:avatar>
            <q-icon name="report_problem" color="amber-9" />
          </template>
          <div class="text-body2">
            <strong>Diferença de caixa no fecho</strong>
            <template v-if="apuredDifference">
              ({{ apuredDifference.tipo === 'QUEBRA' ? 'quebra' : 'sobra' }} de
              {{ formatMZN(apuredDifference.valor) }})
            </template>
            <template v-else>
              ({{ formatMZN(Math.abs(Number(register.difference))) }} —
              {{ Number(register.difference) > 0 ? 'sobra' : 'quebra' }})
            </template>
            — auto de ocorrência (DIFERENCA_CAIXA) pendente de justificação pelo
            Administrador e de lançamento na conta 58 — Quebras de Caixa.
          </div>
          <div v-if="closingNotice" class="text-caption q-mt-xs">{{ closingNotice }}</div>
        </q-banner>

        <!-- ═══════════ AÇÕES + TABELA DE MOVIMENTOS ═══════════ -->
        <q-card flat bordered style="border-radius: 12px; overflow: hidden">
          <q-card-section class="row items-center q-py-sm" data-tour="caixa-movimentos">
            <div class="col text-subtitle2 text-weight-bold">Movimentos do Dia</div>
            <template v-if="isOpen">
              <q-btn
                outline
                color="positive"
                no-caps
                icon="add_circle"
                label="Nova Entrada"
                size="sm"
                class="q-mr-sm"
                @click="openMovementDialog('ENTRADA')"
              />
              <q-btn
                outline
                color="negative"
                no-caps
                icon="remove_circle"
                label="Nova Saída"
                size="sm"
                class="q-mr-sm"
                @click="openMovementDialog('SAIDA')"
              />
            </template>
          </q-card-section>

          <q-table
            :rows="movements"
            :columns="columns"
            row-key="id"
            flat
            bordered
            dense
            separator="horizontal"
            :rows-per-page-options="[10, 25, 50]"
            v-model:pagination="pagination"
            :loading="loadingMovements"
            no-data-label="Sem movimentos registados hoje."
          >
            <!-- Hora -->
            <template v-slot:body-cell-time="props">
              <q-td :props="props" class="text-center">
                {{ formatTime(props.row.createdAt) }}
              </q-td>
            </template>

            <!-- Categoria (chip colorido) -->
            <template v-slot:body-cell-category="props">
              <q-td :props="props" class="text-center">
                <q-chip :color="categoryColor(props.row.category)" text-color="white" dense style="font-size: 10px">
                  {{ categoryLabel(props.row.category) }}
                </q-chip>
                <q-badge v-if="props.row.isAutomatic" outline color="grey-6" label="auto" style="font-size: 9px; margin-left: 4px" />
              </q-td>
            </template>

            <!-- Valor -->
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="text-right">
                <span
                  class="text-weight-bold"
                  :class="props.row.type === 'ENTRADA' ? 'text-positive' : 'text-negative'"
                >
                  {{ props.row.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(props.row.amount) }}
                </span>
              </q-td>
            </template>

            <!-- Tipo -->
            <template v-slot:body-cell-type="props">
              <q-td :props="props" class="text-center">
                <q-badge :color="props.row.type === 'ENTRADA' ? 'positive' : 'negative'" style="font-size: 10px">
                  {{ props.row.type }}
                </q-badge>
              </q-td>
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
        </q-card>

        <!-- ═══════════ RODAPÉ: OPERAÇÕES OFICIAIS DE TESOURARIA (terminologia BM) ═══════════ -->
        <div v-if="isOpen" class="q-mt-md q-pa-sm rounded-borders bg-grey-1 row q-gutter-sm items-center" data-tour="caixa-tesouraria">
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
          <div class="text-caption text-grey-7 q-mb-sm">
            <q-icon name="info" size="14px" class="q-mr-xs" />
            Conte o <strong>fundo de troco</strong> nota a nota e moeda a moeda — o total é
            calculado pelo sistema.
          </div>
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
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Confirmar Abertura"
            :loading="saving"
            @click="submitOpen"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: NOVO MOVIMENTO ═══════════ -->
    <q-dialog v-model="movementDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">
          {{ movementDialogTitle }}
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
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
            :hint="movementDescriptionHint"
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

    <!-- ═══════════ DIALOG: FECHAR CAIXA (contagem por denominação) ═══════════ -->
    <q-dialog v-model="closeDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">Folha de Contagem de Fecho - Conferência Cega</q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-pa-sm rounded-borders bg-blue-1 q-mb-sm">
            <div class="text-caption text-grey-8">
              <q-icon name="info" size="14px" class="q-mr-xs" />
              Conte apenas o <strong>dinheiro físico na gaveta</strong>, nota a nota e moeda a
              moeda. O sistema apura a diferença no fecho — não lhe mostramos o valor
              esperado, para a contagem ser sua.
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

          <q-input
            v-model="closeForm.notes"
            outlined
            dense
            type="textarea"
            rows="2"
            label="Observações do fecho"
            hint="Ex.: quebra confirmada com o operador do balcão"
            class="q-mt-sm"
          />

          <div class="q-mt-sm text-caption text-grey-7">
            <q-icon name="savings" size="13px" class="q-mr-xs" />
            Use <strong>Fecho com entrega do excedente ao Cofre</strong> ou
            <strong>com depósito do excedente no banco</strong> depois de registar a
            entrega/depósito correspondente.
          </div>
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { format, parseISO } from 'date-fns'
// Folha de Contagem de Caixa (MT) — componente oficial de contagem por
// denominação (Denominação | Quantidade | Subtotal), partilhado com o Caixa Central.
import FolhaContagem from '@/components/caixa/FolhaContagem.vue'
// Modo ELECTRONIC: abertura/reconciliação manual contra uma conta bancária
// já cadastrada (a página só o mostra quando a empresa escolhe este modo).
import ElectronicCashPanel from '@/components/caixa/ElectronicCashPanel.vue'
// Contagem de numerário por denominação (valores faciais do metical) — helper
// partilhado com o backend (web-app-v2/src/utils/mznDenominations.js).
import {
  MZN_DENOMINATION_META,
  emptyDenominationCount,
  sumDenominations,
  isEmptyDenominations
} from '@/utils/mznDenominations'

// Grelha de contagem: notas primeiro, depois moedas.
const NOTA_DENOMINATIONS = MZN_DENOMINATION_META.filter((d) => d.tipo === 'NOTA')
const MOEDA_DENOMINATIONS = MZN_DENOMINATION_META.filter((d) => d.tipo === 'MOEDA')

/**
 * CAIXA DIÁRIO (conformidade com a contabilidade moçambicana — Mapa de Caixa,
 * Modelo BM): status → resumo (4 cards) + limite de numerário em caixa →
 * movimentos (incluindo os tipos oficiais de tesouraria) → FECHO POR CONTAGEM
 * CEGA de denominações, em que o backend apura a diferença.
 */
const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

// ─── Estado ───
const loading = ref(false)
const saving = ref(false)
const loadingMovements = ref(false)
const register = ref(null)      // caixa de hoje (aberto ou fechado)
const movements = ref([])
// Modo de caixa da empresa: PHYSICAL (contagem) ou ELECTRONIC (reconciliação
// bancária manual). Fica null até ser carregado para não mostrar o ecrã errado.
const cashMode = ref(null)

const isOpen = computed(() => !!register.value && register.value.status === 'ABERTO')

// Saldo actual = saldo inicial + entradas − saídas (espelha o cálculo do backend)
const currentBalance = computed(() => {
  if (!register.value) return 0
  return round2(
    (Number(register.value.opening_balance) || 0) +
    (Number(register.value.total_in) || 0) -
    (Number(register.value.total_out) || 0)
  )
})

// FUNDO DE MANEIO contado na abertura (memorando físico — não é saldo).
// O saldo DISPONÍVEL do caixa (`opening_balance`) é sempre 0 na abertura.
const fundoMemo = computed(() => {
  if (!register.value) return 0
  const counted = register.value.counted_open
  return round2(Number(counted != null ? counted : register.value.opening_balance) || 0)
})

// Saldo em DINHEIRO FÍSICO (gaveta) = fundo de maneio + entradas cash − saídas cash.
// É este o valor que deve bater certo com a contagem no fecho do caixa —
// as entradas electrónicas (M-Pesa/transferência) nunca passam pela gaveta.
const cashBalance = computed(() => {
  if (!register.value) return 0
  return round2(
    fundoMemo.value +
    (Number(register.value.total_cash_in) || 0) -
    (Number(register.value.total_cash_out) || 0)
  )
})

// Movimento electrónico do dia (entradas − saídas bancárias/móveis).
const electronicBalance = computed(() => {
  if (!register.value) return 0
  return round2(
    (Number(register.value.total_bank_in) || 0) -
    (Number(register.value.total_bank_out) || 0)
  )
})

// ─── Contador ao vivo da gaveta ───
// displayCash anima de suave até cashBalance sempre que um movimento muda o
// saldo (fetchToday após cada registo); flash dá feedback verde/vermelho.
const displayCash = ref(0)
const flash = ref(null) // 'up' | 'down' | null
let flashTimer = null
let animFrame = null

watch(cashBalance, (target, prev) => {
  // Flash direccional: verde quando sobe (entrada), vermelho quando desce.
  flash.value = target > prev ? 'up' : 'down'
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = null }, 1100)

  // Animação de contagem (ease-out cúbico, ~600 ms) até ao novo valor.
  const from = Number(displayCash.value) || 0
  const start = performance.now()
  const duration = 600
  if (animFrame) cancelAnimationFrame(animFrame)
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    displayCash.value = from + (target - from) * eased
    if (t < 1) {
      animFrame = requestAnimationFrame(tick)
    } else {
      displayCash.value = target
    }
  }
  animFrame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (flashTimer) clearTimeout(flashTimer)
  if (animFrame) cancelAnimationFrame(animFrame)
})

// ─── Formatação ───
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100

// Formatação MZN exigida: valor.toLocaleString('pt-MZ') + ' MZN'
function formatMZN(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

// date-fns para datas (dependência já existente no projecto)

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

// ─── Categorias ───
// Automáticas (só sistema): DESEMBOLSO, REEMBOLSO, JUROS_MORA, TAXA_ADMIN
// Manuais: despesas correntes do escritório
const categoryMeta = {
  DESEMBOLSO:   { label: 'Desembolso',   color: 'deep-orange' },
  REEMBOLSO:    { label: 'Reembolso',    color: 'green' },
  JUROS_MORA:   { label: 'Juros Mora',   color: 'amber-8' },
  TAXA_ADMIN:   { label: 'Taxa Admin',   color: 'blue-grey' },
  // Tipos OFICIAIS de tesouraria (contabilidade moçambicana)
  ENTREGA_COFRE:     { label: 'Entrega ao Cofre',   color: 'teal' },
  REFORCO_CAIXA:     { label: 'Reforço de caixa',   color: 'purple' },
  DEPOSITO_BANCARIO: { label: 'Depósito bancário',  color: 'indigo' },
  DIFERENCA_CAIXA:   { label: 'Diferença de caixa', color: 'deep-orange' },
  DEPOSITO_BANCO:    { label: 'Depósito no banco',  color: 'indigo' },
  LEVANTAMENTO_BANCO:{ label: 'Levantamento no banco', color: 'purple' },
  TRANSFERENCIA:     { label: 'Transferência',      color: 'cyan-8' },
  MATERIAL:     { label: 'Material',     color: 'brown' },
  SALARIO:      { label: 'Salário',      color: 'purple' },
  INTERNET:     { label: 'Internet',     color: 'indigo' },
  LUZ:          { label: 'Luz',          color: 'orange' },
  AGUA:         { label: 'Água',         color: 'light-blue' },
  COMBUSTIVEL:  { label: 'Combustível',  color: 'brown' },
  RENTABILIDADE:{ label: 'Rentabilidade',color: 'teal' },
  SALARIOS:     { label: 'Salários',     color: 'purple' },
  REUNIAO:      { label: 'Reunião',      color: 'pink' },
  TRANSPORTE:   { label: 'Transporte',   color: 'cyan-8' },
  OUTROS:       { label: 'Outros',       color: 'grey' }
}

function categoryLabel(category) {
  return categoryMeta[category]?.label || category
}

function categoryColor(category) {
  return categoryMeta[category]?.color || 'grey'
}

// Categorias disponíveis para movimentos manuais (exclui as automáticas).
// DIFERENCA_CAIXA é um auto de ocorrência do fecho — só o backend a cria.
const AUTOMATIC_CATEGORIES = ['DESEMBOLSO', 'REEMBOLSO', 'JUROS_MORA', 'TAXA_ADMIN', 'DIFERENCA_CAIXA']
const manualCategoryOptions = Object.entries(categoryMeta)
  .filter(([key]) => !AUTOMATIC_CATEGORIES.includes(key))
  .map(([value, meta]) => ({ label: meta.label, value }))

// ─── Tabela ───
const pagination = ref({ page: 1, rowsPerPage: 25 })
const columns = [
  { name: 'time', label: 'Hora', field: 'createdAt', align: 'center', sortable: true },
  { name: 'category', label: 'Categoria', field: 'category', align: 'center' },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'center' },
  { name: 'comprovativo', label: 'Comprovativo', field: () => '', align: 'center' }
]

// ─── API ───
async function loadCashMode() {
  try {
    const { data } = await api.get('/api/cash-register/mode')
    if (data.success) cashMode.value = data.result.mode
  } catch (error) {
    // Sem resposta: assume o modo físico (fluxo anterior) para não bloquear a página.
    console.error('Erro ao carregar o modo de caixa:', error)
    cashMode.value = 'PHYSICAL'
  }
}

async function fetchToday() {
  loading.value = true
  try {
    const { data } = await api.get('/api/cash-registers/today')
    if (data.success) {
      register.value = data.result.register
      movements.value = data.result.register?.movements || []
      // Limite de numerário em caixa (circular do BM) + rótulos oficiais
      cashLimitInfo.value = data.result.cashLimit || null
      closingTypeLabels.value = data.result.closingTypeLabels || null
    }
  } catch (error) {
    console.error('Erro ao carregar caixa de hoje:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar caixa', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ─── Dialog: abrir caixa ───
// O caixa abre sempre com SALDO ZERO DISPONÍVEL. O fundo de maneio é CONTADO
// por denominação; o backend soma a grelha e guarda-o como memorando físico
// (não é saldo, não arrasta e não gera sobras/quebras no fecho).
const openDialog = ref(false)
const openForm = ref({ denominations: emptyDenominationCount() })
const openCountedTotal = computed(() => sumDenominations(openForm.value.denominations))

// Limite de numerário em caixa + rótulos dos tipos de fecho (vêm do /today).
const cashLimitInfo = ref(null)
const closingTypeLabels = ref(null)

// O arrasto de saldo foi invalidado ("saldo zero na abertura"): não há
// sugestão de saldo inicial — o valor do fecho anterior não é arrastado.
function openOpenDialog() {
  openForm.value = { denominations: emptyDenominationCount() }
  openDialog.value = true
}

async function submitOpen() {
  if (isEmptyDenominations(openForm.value.denominations)) {
    $q.notify({
      type: 'warning',
      message: 'Conte o fundo de troco por denominação (notas e moedas)',
      position: 'top'
    })
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
      await fetchToday()
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao abrir caixa', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Dialog: novo movimento ───
const movementDialog = ref(false)
const movementForm = ref({ type: 'ENTRADA', category: null, amount: null, description: '' })

// OPERAÇÕES OFICIAIS DE TESOURARIA (contabilidade moçambicana) — substituem os
// termos brasileiros "sangria"/"suprimento".
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

function openMovementDialog(type) {
  movementForm.value = { type, category: null, amount: null, description: '' }
  movementDialog.value = true
}

// Dialog aberto a partir de uma operação oficial (categoria pré-seleccionada).
function openTreasuryDialog(operation) {
  movementForm.value = {
    type: operation.type,
    category: operation.category,
    amount: null,
    description: ''
  }
  movementDialog.value = true
}

const movementDescriptionHint = computed(() => {
  const operation = TREASURY_OPERATIONS.find((op) => op.category === movementForm.value.category)
  return operation ? operation.hint : 'Ex.: Internet mensal do escritório'
})

const movementDialogTitle = computed(() => {
  const operation = TREASURY_OPERATIONS.find((op) => op.category === movementForm.value.category)
  if (operation) return operation.label
  return movementForm.value.type === 'ENTRADA' ? 'Nova Entrada' : 'Nova Saída'
})

async function submitMovement() {
  const form = movementForm.value
  if (!form.category || !form.amount || form.amount <= 0 || !form.description?.trim()) {
    $q.notify({ type: 'warning', message: 'Preencha categoria, valor e descrição', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/${register.value.id}/movements`, {
      type: form.type,
      category: form.category,
      amount: form.amount,
      description: form.description.trim()
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Movimento registado!', position: 'top' })
      movementDialog.value = false
      await fetchToday()
    }
  } catch (error) {
    // Circular do BM: a entrada foi recusada por exceder o limite de numerário
    // em caixa — a mensagem do backend diz o que fazer (entrega/depósito).
    const limiteExcedido = error.response?.data?.error === 'CASH_LIMIT_EXCEEDED'
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao registar movimento',
      position: 'top',
      timeout: limiteExcedido ? 9000 : 5000
    })
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

// ─── Dialog: fechar caixa (CONTAGEM CEGA por denominação) ───
// O operador conta as notas e moedas da gaveta (CONTAGEM CEGA); o backend soma,
// apura a diferença e, se não bater, cria o auto de ocorrência (DIFERENCA_CAIXA)
// pendente de justificação pelo Admin. O saldo apurado pelo sistema NUNCA é
// mostrado nem devolvido ao frontend.
const closeDialog = ref(false)
const closeForm = ref({
  denominations: emptyDenominationCount(),
  tipo_fechamento: 'NORMAL',
  notes: ''
})
const closeCountedTotal = computed(() => sumDenominations(closeForm.value.denominations))

// Diferença apurada no ÚLTIMO fecho desta sessão (auto de ocorrência pendente).
const pendingDifference = ref(null)
const closingNotice = ref('')
const apuredDifference = computed(() => pendingDifference.value)

// ─── Pós-fecho (conferência cega): resultado apresentado ao operador ───
const closeResultDialog = ref(false)   // "Caixa Certo - Gerar Mapa Diário"
const autoDialog = ref(false)          // "Auto de Ocorrência - Diferença de Caixa"
const autoRegistered = ref(false)      // observação do operador já submetida
const autoForm = ref({ quebra: true, valor: 0, observacao: '' })

// Tipos de fecho (rótulos oficiais do backend, com recurso local em PT-MZ).
const closingTypeOptions = computed(() => {
  const labels = closingTypeLabels.value || {}
  const fallback = {
    NORMAL: 'Fecho normal (sem divergência)',
    ENTREGA_COFRE: 'Fecho com entrega do excedente ao Cofre',
    DEPOSITO_BANCARIO: 'Fecho com depósito do excedente no banco'
  }
  return ['NORMAL', 'ENTREGA_COFRE', 'DEPOSITO_BANCARIO'].map((value) => ({
    value,
    label: labels[value] || fallback[value]
  }))
})

function openCloseDialog() {
  closeForm.value = {
    denominations: emptyDenominationCount(),
    tipo_fechamento: 'NORMAL',
    notes: ''
  }
  closeDialog.value = true
}

async function submitClose() {
  if (isEmptyDenominations(closeForm.value.denominations)) {
    // Gaveta vazia (ex.: fundo integralmente entregue ao Cofre): confirmar.
    $q.dialog({
      title: 'Confirmar contagem a zero',
      message: 'Não contou nenhuma nota nem moeda. Confirma que a gaveta está vazia?',
      cancel: true,
      persistent: true
    }).onOk(() => {
      postClose()
    })
    return
  }
  postClose()
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
      closingNotice.value = data.result?.aviso || ''
      closeDialog.value = false
      await fetchToday()
      if (Math.abs(diff) < 0.01) {
        // CAIXA CERTO — a contagem confirma o valor do caixa.
        $q.notify({ type: 'positive', message: 'Caixa Certo - Gerar Mapa Diário', position: 'top' })
        closeResultDialog.value = true
      } else {
        // AUTO DE OCORRÊNCIA — a Observação / Justificação do operador é
        // OBRIGATÓRIA antes de poder imprimir o Mapa Diário.
        autoForm.value = { quebra: diff < 0, valor: Math.abs(diff), observacao: '' }
        autoRegistered.value = false
        autoDialog.value = true
      }
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao fechar o caixa',
      position: 'top',
      timeout: 9000
    })
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
    $q.notify({
      type: 'warning',
      message: 'A Observação / Justificação é obrigatória (mín. 10 caracteres)',
      position: 'top'
    })
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
      $q.notify({
        type: 'positive',
        message: 'Auto de ocorrência registado — pendente de validação pelo Administrador.',
        position: 'top'
      })
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao registar o auto de ocorrência',
      position: 'top'
    })
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
// MAPA DIÁRIO DE CAIXA — MODELO BM (documento oficial do dia):
// Saldo Inicial · Entradas · Saídas · Entregas ao Cofre · Saldo Final,
// seguido do detalhe (depósitos, quebras, sobras, diferença) e dos movimentos.
// Gerado no BACKEND via /api/reports/table-pdf (pdfkit no servidor).
function moneyRaw(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

async function exportPDF() {
  if (movements.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há movimentos para exportar', position: 'top' })
    return
  }
  try {
    const { downloadTablePdf, tablePdfError } = await import('@/utils/tablePdf')
    const { buildMapaDiarioPayload } = await import('@/utils/mapaDiarioBM')
    const reg = register.value
    const dayLabel = formatDay(reg.opening_date)
    const mapa = reg.mapa_bm || {}
    const balanced = Math.abs(Number(mapa.diferenca ?? reg.difference ?? 0)) < 0.01

    // ── MAPA DIÁRIO DE CAIXA — MODELO BM (A4, util partilhado) ──
    const mapaPayload = buildMapaDiarioPayload({
      register: reg,
      movements: movements.value,
      userName: authStore.userName || '—',
      dayLabel,
      denominations: reg.denominations_close || reg.denominations_open || null
    })
    await downloadTablePdf(mapaPayload, `${mapaPayload.filename}.pdf`)

    await downloadTablePdf({
      title: `Mapa Diário de Caixa - Modelo BM — Movimentos (${dayLabel})`,
      meta: [
        `+ ${moneyRaw(reg.total_cash_in)} / − ${moneyRaw(reg.total_cash_out)} em dinheiro físico`,
        `electrónico + ${moneyRaw(reg.total_bank_in)} / − ${moneyRaw(reg.total_bank_out)} MZN`
      ],
      filename: `mapa-de-caixa-${reg.opening_date}-movimentos`,
      columns: [
        { label: 'Hora', width: 55 },
        { label: 'Categoria', width: 80 },
        { label: 'Descrição' },
        { label: 'Origem', width: 60, align: 'center' },
        { label: 'Valor', width: 85, align: 'right' }
      ],
      rows: movements.value.map(m => [
        formatTime(m.createdAt),
        categoryLabel(m.category),
        m.description || '—',
        m.isAutomatic ? 'Automático' : 'Manual',
        `${m.type === 'ENTRADA' ? '+' : '-'} ${moneyRaw(m.amount)} MZN`
      ])
    }, `mapa-de-caixa-${reg.opening_date}-movimentos.pdf`)

    $q.notify({ type: 'positive', message: 'Mapa Diário de Caixa gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar o Mapa de Caixa:', e)
    const { tablePdfError } = await import('@/utils/tablePdf')
    $q.notify({ type: 'negative', message: await tablePdfError(e, 'Erro ao gerar o Mapa de Caixa'), position: 'top' })
  }
}

// ─── Mount ───
onMounted(async () => {
  await loadCashMode()
  if (cashMode.value === 'ELECTRONIC') {
    // O painel electrónico carrega o seu próprio estado (conta + reconciliação).
    loading.value = false
    return
  }
  fetchToday()
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

/* Contador ao vivo do dinheiro em gaveta (cabeçalho) */
.drawer-counter {
  padding: 6px 14px;
  border-radius: 10px;
  text-align: right;
  background: rgba(25, 118, 210, 0.06);
  border: 1px solid rgba(25, 118, 210, 0.18);
  transition: background-color 0.3s, box-shadow 0.3s, opacity 0.3s;

  &.drawer-closed {
    opacity: 0.55;
  }
  &.flash-up {
    background: rgba(46, 125, 50, 0.14);
    box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.3);
  }
  &.flash-down {
    background: rgba(198, 40, 40, 0.14);
    box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.3);
  }
}
body.body--dark .drawer-counter {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}

/* ─── Grelha de contagem de numerário (notas e moedas) ─── */
.denom-grid {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.denom-group {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
  margin: 6px 0 4px;
}

.denom-row {
  display: grid;
  grid-template-columns: 96px 108px 1fr;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.denom-label {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.denom-subtotal {
  font-size: 12px;
  text-align: right;
  color: #374151;
  font-variant-numeric: tabular-nums;
}

.denom-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(46, 125, 50, 0.08);
  border: 1px solid rgba(46, 125, 50, 0.22);
  font-size: 13px;
}

.denom-total strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

body.body--dark .denom-subtotal {
  color: #d1d5db;
}
body.body--dark .denom-total {
  background: rgba(46, 125, 50, 0.18);
}
</style>
