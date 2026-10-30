<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="handleClose"
    persistent
    transition-show="scale"
    transition-hide="scale"
    class="bank-dialog-wrapper"
  >
    <q-card class="bank-payment-card column no-wrap">
      <!-- HEADER BANCÁRIO PREMIUM -->
      <div class="bank-card-header q-pa-md row items-center justify-between no-wrap">
        <div class="row items-center no-wrap">
          <q-avatar size="40px" class="q-mr-sm bank-shield-avatar shadow-1">
            <q-icon name="security" size="22px" color="white" />
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bolder text-white row items-center">
              <span>Pagamento M-Pesa Seguro</span>
              <q-badge color="teal-3" text-color="teal-10" class="q-ml-xs text-bold" style="font-size: 10px">
                OPEN API
              </q-badge>
            </div>
            <div class="text-caption text-white-8" style="opacity: 0.9">
              Crédito #{{ inst?.loanId }} · Prestação {{ ordinalNumber(inst?.installmentOrder) }}<template v-if="paymentTotalInstallments"> de {{ paymentTotalInstallments }}</template>
            </div>
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          color="white"
          :disable="step === 'WAITING_PIN'"
          @click="handleClose(false)"
        />
      </div>

      <!-- CORPO COM SCROLL -->
      <q-card-section class="bank-card-body col scroll q-pa-md">
        <!-- ETAPA 1: SELEÇÃO DO PLANO E FORMULÁRIO -->
        <template v-if="step === 'FORM'">
          <!-- BANNER DE ATRASO / MORA (SE HOUVER) -->
          <div v-if="paymentLateInterest > 0" class="mora-alert-card q-pa-md q-mb-md">
            <div class="row items-center justify-between no-wrap q-mb-xs">
              <div class="row items-center text-negative text-weight-bold" style="font-size: 13px">
                <q-icon name="schedule" size="18px" class="q-mr-xs" />
                <span>Prestação em Atraso ({{ inst?.lateDays }} dias)</span>
              </div>
              <q-badge color="negative" class="text-bold">Venceu a {{ formatDate(inst?.dueDate) }}</q-badge>
            </div>
            <div class="text-caption text-grey-8 q-mb-sm">
              Os juros de mora legais acumulam diariamente até à regularização integral.
            </div>
            <div class="row q-col-gutter-xs text-center mora-kpis">
              <div class="col-4">
                <div class="kpi-box">
                  <div class="text-caption text-grey-6">Prestação Base</div>
                  <div class="text-weight-bold text-grey-9">{{ formatMoney(paymentRemaining) }}</div>
                </div>
              </div>
              <div class="col-4">
                <div class="kpi-box mora-box">
                  <div class="text-caption text-negative">Juros de Mora</div>
                  <div class="text-weight-bolder text-negative">+ {{ formatMoney(paymentLateInterest) }}</div>
                </div>
              </div>
              <div class="col-4">
                <div class="kpi-box total-box">
                  <div class="text-caption text-primary">Total p/ Quitação</div>
                  <div class="text-weight-bolder text-primary">{{ formatMoney(paymentTotalDue) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- BANNER NORMAL SE NÃO HOUVER ATRASO -->
          <div v-else class="normal-due-card q-pa-md q-mb-md">
            <div class="row items-center justify-between">
              <div>
                <div class="text-caption text-grey-6">Vencimento da Prestação</div>
                <div class="text-subtitle1 text-weight-bold text-grey-9">{{ formatDate(inst?.dueDate) }}</div>
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-6">Saldo a Liquidar</div>
                <div class="text-h6 text-weight-bolder text-primary">{{ formatMoney(paymentRemaining) }}</div>
              </div>
            </div>
          </div>

          <!-- SELEÇÃO DE PLANO DE PAGAMENTO (SMART BANKING TILES) -->
          <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-xs row items-center">
            <q-icon name="tune" size="18px" color="primary" class="q-mr-xs" />
            <span>Escolha a modalidade de liquidação</span>
          </div>

          <div class="payment-options-grid q-mb-md q-gutter-y-xs">
            <!-- OPÇÃO 1: TOTAL COM MORA (QUANDO HÁ MORA) -->
            <div
              v-if="paymentLateInterest > 0"
              class="option-tile"
              :class="{ 'is-selected': selectedPlan === 'TOTAL_MORA' }"
              @click="selectPlan('TOTAL_MORA')"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center no-wrap col" style="min-width: 0">
                  <div class="radio-circle q-mr-sm" :class="{ 'checked': selectedPlan === 'TOTAL_MORA' }">
                    <q-icon name="check" size="12px" v-if="selectedPlan === 'TOTAL_MORA'" />
                  </div>
                  <div class="col" style="min-width: 0">
                    <div class="row items-center">
                      <span class="text-weight-bolder text-grey-9" style="font-size: 13px">Regularização Total c/ Mora</span>
                      <q-badge color="positive" class="q-ml-xs text-bold" style="font-size: 10px">RECOMENDADO</q-badge>
                    </div>
                    <div class="text-caption text-grey-6 ellipsis">Liquida 100% da prestação + juros de mora acumulados</div>
                  </div>
                </div>
                <div class="text-right q-ml-sm">
                  <div class="text-weight-bolder text-positive" style="font-size: 15px">{{ formatMoney(paymentTotalDue) }}</div>
                </div>
              </div>
            </div>

            <!-- OPÇÃO 2: TOTAL DA PARCELA (SE NÃO HOUVER MORA) -->
            <div
              v-else
              class="option-tile"
              :class="{ 'is-selected': selectedPlan === 'TOTAL_INSTALLMENT' }"
              @click="selectPlan('TOTAL_INSTALLMENT')"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center no-wrap col" style="min-width: 0">
                  <div class="radio-circle q-mr-sm" :class="{ 'checked': selectedPlan === 'TOTAL_INSTALLMENT' }">
                    <q-icon name="check" size="12px" v-if="selectedPlan === 'TOTAL_INSTALLMENT'" />
                  </div>
                  <div class="col" style="min-width: 0">
                    <div class="row items-center">
                      <span class="text-weight-bolder text-grey-9" style="font-size: 13px">Liquidação Total da Prestação</span>
                      <q-badge color="positive" class="q-ml-xs text-bold" style="font-size: 10px">RECOMENDADO</q-badge>
                    </div>
                    <div class="text-caption text-grey-6 ellipsis">Liquida integralmente a prestação</div>
                  </div>
                </div>
                <div class="text-right q-ml-sm">
                  <div class="text-weight-bolder text-positive" style="font-size: 15px">{{ formatMoney(paymentRemaining) }}</div>
                </div>
              </div>
            </div>

            <!-- OPÇÃO 3: APENAS A PARCELA (QUANDO HÁ MORA) -->
            <div
              v-if="paymentLateInterest > 0"
              class="option-tile"
              :class="{ 'is-selected': selectedPlan === 'BASE_ONLY' }"
              @click="selectPlan('BASE_ONLY')"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center no-wrap col" style="min-width: 0">
                  <div class="radio-circle q-mr-sm" :class="{ 'checked': selectedPlan === 'BASE_ONLY' }">
                    <q-icon name="check" size="12px" v-if="selectedPlan === 'BASE_ONLY'" />
                  </div>
                  <div class="col" style="min-width: 0">
                    <div class="text-weight-bolder text-grey-9" style="font-size: 13px">Apenas Prestação Base</div>
                    <div class="text-caption text-grey-6 ellipsis">Paga o valor nominal; mora continuará a transitar</div>
                  </div>
                </div>
                <div class="text-right q-ml-sm">
                  <div class="text-weight-bold text-grey-8" style="font-size: 14px">{{ formatMoney(paymentRemaining) }}</div>
                </div>
              </div>
            </div>

            <!-- OPÇÃO 4: PARCIAL MÍNIMO REGULAMENTAR (15%) -->
            <div
              class="option-tile"
              :class="{ 'is-selected': selectedPlan === 'MINIMUM' }"
              @click="selectPlan('MINIMUM')"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center no-wrap col" style="min-width: 0">
                  <div class="radio-circle q-mr-sm" :class="{ 'checked': selectedPlan === 'MINIMUM' }">
                    <q-icon name="check" size="12px" v-if="selectedPlan === 'MINIMUM'" />
                  </div>
                  <div class="col" style="min-width: 0">
                    <div class="text-weight-bolder text-grey-9" style="font-size: 13px">Pagamento Parcial Mínimo (15%)</div>
                    <div class="text-caption text-grey-6 ellipsis">Amortização mínima permitida pelas políticas</div>
                  </div>
                </div>
                <div class="text-right q-ml-sm">
                  <div class="text-weight-bold text-orange-9" style="font-size: 14px">{{ formatMoney(paymentMinAmount) }}</div>
                </div>
              </div>
            </div>

            <!-- OPÇÃO 5: OUTRO VALOR -->
            <div
              class="option-tile"
              :class="{ 'is-selected': selectedPlan === 'CUSTOM' }"
              @click="selectPlan('CUSTOM')"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center no-wrap col" style="min-width: 0">
                  <div class="radio-circle q-mr-sm" :class="{ 'checked': selectedPlan === 'CUSTOM' }">
                    <q-icon name="check" size="12px" v-if="selectedPlan === 'CUSTOM'" />
                  </div>
                  <div class="col" style="min-width: 0">
                    <div class="text-weight-bolder text-grey-9" style="font-size: 13px">Outro Valor Personalizado</div>
                    <div class="text-caption text-grey-6 ellipsis">Definir montante específico</div>
                  </div>
                </div>
                <div class="text-right q-ml-sm">
                  <q-icon name="edit" color="primary" size="18px" />
                </div>
              </div>
            </div>
          </div>

          <!-- INPUT DE VALOR (COM VISUAL BANCÁRIO DE ALTO IMPACTO) -->
          <div class="amount-input-card q-pa-sm q-mb-md">
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-caption text-weight-bold text-grey-7">Valor a debitar na carteira</span>
              <span class="text-caption text-grey-5">Mínimo: {{ formatMoney(paymentMinAmount) }}</span>
            </div>

            <div class="amount-field-wrapper row items-center no-wrap">
              <div class="currency-prefix text-weight-bolder text-positive q-mr-sm">MZN</div>
              <input
                type="number"
                v-model.number="paymentAmount"
                class="bank-amount-input col text-weight-bolder"
                :min="paymentMinAmount"
                :max="paymentAllowedMax"
                step="0.01"
                @input="onAmountCustomInput"
              />
            </div>

            <div v-if="amountError" class="text-negative text-caption q-mt-xs text-weight-bold">
              O montante deve estar entre {{ formatMoney(paymentMinAmount) }} e {{ formatMoney(paymentAllowedMax) }}.
            </div>
          </div>

          <!-- EXTRACTO DE ALOCAÇÃO DO PAGAMENTO (LIVE LEDGER BREAKDOWN) -->
          <div class="bank-ledger-breakdown q-pa-sm q-mb-md">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs row items-center">
              <q-icon name="receipt_long" size="16px" color="primary" class="q-mr-xs" />
              <span>Simulação de Aplicação do Pagamento</span>
            </div>

            <div class="ledger-row row justify-between items-center text-caption q-py-xs" v-if="paymentLateInterest > 0">
              <span class="text-grey-7">1. Cobertura de Juros de Mora:</span>
              <span class="text-weight-bold" :class="calculatedLateCovered >= paymentLateInterest ? 'text-positive' : 'text-negative'">
                {{ formatMoney(calculatedLateCovered) }}
                <span class="text-caption text-grey-5" v-if="calculatedLateCovered < paymentLateInterest">
                  (resta {{ formatMoney(paymentLateInterest - calculatedLateCovered) }})
                </span>
              </span>
            </div>

            <div class="ledger-row row justify-between items-center text-caption q-py-xs">
              <span class="text-grey-7">2. Amortização da Prestação:</span>
              <span class="text-weight-bold text-positive">
                {{ formatMoney(calculatedCapitalCovered) }}
              </span>
            </div>

            <div class="ledger-row row justify-between items-center text-caption q-py-xs" v-if="paymentExcessAmount > 0">
              <span class="text-grey-7">3. Excedente (Próxima Prestação):</span>
              <span class="text-weight-bold text-blue-9">
                + {{ formatMoney(paymentExcessAmount) }}
              </span>
            </div>

            <q-separator class="q-my-xs" />

            <div class="ledger-row row justify-between items-center q-pt-xs">
              <span class="text-caption text-weight-bold text-grey-9">Saldo restante desta prestação:</span>
              <span class="text-subtitle2 text-weight-bolder" :class="calculatedRemainingAfter <= 0 ? 'text-positive' : 'text-orange-9'">
                {{ formatMoney(calculatedRemainingAfter) }}
              </span>
            </div>

            <!-- BADGE DE STATUS RESULTANTE -->
            <div class="q-mt-sm">
              <div v-if="isFullSettlement" class="result-status-badge is-full row items-center q-pa-xs rounded-borders">
                <q-icon name="verified" size="16px" color="positive" class="q-mr-xs" />
                <span class="text-caption text-weight-bold text-positive">
                  Quitação Plena: Esta prestação e os juros de mora ficarão 100% liquidados!
                </span>
              </div>
              <div v-else class="result-status-badge is-partial row items-center q-pa-xs rounded-borders">
                <q-icon name="info" size="16px" color="orange-9" class="q-mr-xs" />
                <span class="text-caption text-weight-bold text-orange-9">
                  Pagamento Parcial: Reduz a dívida. Restará saldo de {{ formatMoney(calculatedRemainingAfter) }}.
                </span>
              </div>
            </div>
          </div>

          <!-- CANAL OFICIAL M-PESA & TELEMÓVEL -->
          <div class="mpesa-account-box q-pa-sm q-mb-sm">
            <div class="row items-center justify-between q-mb-xs">
              <div class="row items-center">
                <q-avatar size="22px" color="red-7" text-color="white" class="q-mr-xs">
                  <q-icon name="smartphone" size="14px" />
                </q-avatar>
                <span class="text-caption text-weight-bold text-grey-9">Telemóvel Vodacom M-Pesa para cobrança</span>
              </div>
              <span class="text-caption text-positive text-weight-bold" v-if="isValidMpesaPhone">
                <q-icon name="check_circle" size="14px" /> Válido
              </span>
            </div>

            <q-input
              v-model="paymentPhone"
              outlined
              dense
              bg-color="white"
              maxlength="12"
              inputmode="numeric"
              placeholder="25884xxxxxxx ou 25885xxxxxxx"
              :error="paymentPhone.length > 0 && !isValidMpesaPhone"
              error-message="O número deve ter 12 dígitos e iniciar por 25884 ou 25885"
              @update:model-value="sanitizePhoneInput"
            >
              <template v-slot:prepend>
                <q-icon name="phone" color="grey-6" size="18px" />
              </template>
            </q-input>

            <div class="text-caption text-grey-6 row items-center q-mt-xs" style="font-size: 11px">
              <q-icon name="lock" size="12px" class="q-mr-xs text-grey-5" />
              <span>O M-Pesa enviará um aviso de segurança USSD ao telemóvel para validar com o seu PIN.</span>
            </div>
          </div>
        </template>

        <!-- ETAPA 2: AGUARDANDO DIGITAÇÃO DO PIN NO TELEMÓVEL -->
        <template v-else-if="step === 'WAITING_PIN'">
          <div class="waiting-pin-container column items-center text-center q-pa-lg">
            <div class="radar-pulse-box q-mb-md">
              <div class="radar-ring"></div>
              <div class="radar-ring delay-1"></div>
              <q-avatar size="80px" color="positive" text-color="white" class="phone-icon-center shadow-3">
                <q-icon name="phone_android" size="44px" />
              </q-avatar>
            </div>

            <div class="text-h6 text-weight-bolder text-grey-9 q-mb-xs">
              Aguardando o seu PIN M-Pesa
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              Enviámos uma notificação para o número <strong class="text-grey-9">{{ paymentPhone }}</strong>.
            </div>

            <!-- CRONÓMETRO CIRCULAR -->
            <div class="countdown-badge q-pa-sm q-mb-md row items-center justify-center">
              <q-icon name="timer" size="20px" color="positive" class="q-mr-xs" />
              <span class="text-subtitle1 text-weight-bolder text-positive">{{ countdown }}s</span>
              <span class="text-caption text-grey-6 q-ml-xs">restantes</span>
            </div>

            <!-- INSTRUÇÕES VISUAIS PASSO A PASSO -->
            <div class="pin-steps-card q-pa-md q-mb-md full-width text-left">
              <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-sm row items-center">
                <q-icon name="touch_app" size="18px" color="primary" class="q-mr-xs" />
                <span>O que fazer agora:</span>
              </div>
              <div class="step-line-item row items-center no-wrap q-mb-xs">
                <div class="step-num q-mr-sm">1</div>
                <div class="text-caption text-grey-8">Desbloqueie o ecrã do seu telemóvel.</div>
              </div>
              <div class="step-line-item row items-center no-wrap q-mb-xs">
                <div class="step-num q-mr-sm">2</div>
                <div class="text-caption text-grey-8">Verifique o valor de <strong>{{ formatMoney(paymentAmount) }}</strong> na janela Vodacom.</div>
              </div>
              <div class="step-line-item row items-center no-wrap">
                <div class="step-num q-mr-sm">3</div>
                <div class="text-caption text-grey-8">Introduza o seu <strong>PIN M-Pesa</strong> e confirme.</div>
              </div>
            </div>

            <div class="text-caption text-grey-5 row items-center q-gutter-x-xs">
              <q-spinner-dots size="18px" color="positive" />
              <span>A sincronizar automaticamente com a Vodacom...</span>
            </div>
          </div>
        </template>

        <!-- ETAPA 3: PAGAMENTO CONCLUÍDO COM SUCESSO -->
        <template v-else-if="step === 'SUCCESS'">
          <div class="success-container column items-center text-center q-pa-md">
            <q-avatar size="76px" color="positive" text-color="white" class="q-mb-md shadow-2">
              <q-icon name="check" size="46px" />
            </q-avatar>

            <div class="text-h5 text-weight-bolder text-positive q-mb-xs">
              Pagamento Confirmado!
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              O montante de <strong>{{ formatMoney(paymentAmount) }}</strong> foi liquidado via M-Pesa Open API.
            </div>

            <!-- RECIBO BANCÁRIO DIGITAL -->
            <div class="bank-receipt-card q-pa-md full-width q-mb-md text-left">
              <div class="row items-center justify-between q-mb-xs">
                <span class="text-caption text-grey-6">Documento Oficial:</span>
                <span class="text-subtitle2 text-weight-bolder text-primary">{{ receiptData?.numero || 'Recibo Emitido' }}</span>
              </div>
              <div class="row items-center justify-between q-mb-xs" v-if="mpesaReceipt">
                <span class="text-caption text-grey-6">Referência M-Pesa:</span>
                <span class="text-caption text-weight-bold text-positive">{{ mpesaReceipt }}</span>
              </div>
              <div class="row items-center justify-between q-mb-xs">
                <span class="text-caption text-grey-6">Data de Liquidação:</span>
                <span class="text-caption text-weight-bold text-grey-9">Hoje (Tempo Real)</span>
              </div>
              <q-separator class="q-my-sm" />
              <div class="row items-center justify-center text-caption text-grey-7">
                <q-icon name="verified_user" color="positive" size="16px" class="q-mr-xs" />
                Certificado pela Autoridade Tributária com QR Code
              </div>
            </div>

            <q-btn
              v-if="receiptData"
              unelevated
              color="primary"
              icon="picture_as_pdf"
              label="Descarregar Recibo Oficial (PDF)"
              no-caps
              class="full-width btn-bank-action q-mb-sm"
              @click="downloadReceipt"
            />
          </div>
        </template>

        <!-- ETAPA 4: FALHA / RECUSA -->
        <template v-else-if="step === 'FAILED'">
          <div class="failed-container column items-center text-center q-pa-md">
            <q-avatar size="64px" color="negative" text-color="white" class="q-mb-md shadow-2">
              <q-icon name="priority_high" size="36px" />
            </q-avatar>

            <div class="text-h6 text-weight-bolder text-negative q-mb-xs">
              Não foi possível concluir
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              {{ errorMessage || 'O pagamento não foi autorizado pelo M-Pesa. Verifique o seu saldo e tente novamente.' }}
            </div>

            <div class="row q-gutter-sm full-width">
              <q-btn
                outline
                color="grey-8"
                label="Voltar"
                no-caps
                class="col btn-bank-action"
                @click="handleClose(false)"
              />
              <q-btn
                unelevated
                color="positive"
                icon="refresh"
                label="Tentar Novamente"
                no-caps
                class="col-7 btn-bank-action"
                @click="retryPayment"
              />
            </div>
          </div>
        </template>
      </q-card-section>

      <!-- FOOTER FIXO DE AÇÃO BANCÁRIA -->
      <q-card-actions align="right" class="bank-card-footer q-px-lg q-py-sm bg-white row no-wrap items-center justify-end q-gutter-sm" v-if="step === 'FORM'">
        <q-btn
          flat
          label="Cancelar"
          color="grey-7"
          no-caps
          class="btn-bank-cancel"
          @click="handleClose(false)"
        />
        <q-btn
          unelevated
          label="Pagar"
          icon="payments"
          color="positive"
          no-caps
          class="btn-bank-pay btn-pay-primary"
          :loading="paying"
          :disable="!canSubmitPayment"
          @click="processMpesaPayment"
        />
      </q-card-actions>

      <q-card-actions align="right" class="bank-card-footer q-px-lg q-py-sm bg-white row no-wrap items-center justify-end q-gutter-sm" v-else-if="step === 'WAITING_PIN'">
        <q-btn
          flat
          label="Cancelar"
          color="negative"
          no-caps
          class="btn-bank-cancel"
          @click="cancelWaiting"
        />
        <q-btn
          unelevated
          label="Já digitei o PIN / Verificar"
          icon="sync"
          color="primary"
          no-caps
          class="btn-bank-pay"
          style="min-width: 190px;"
          :loading="checkingStatus"
          @click="manualCheckStatus"
        />
      </q-card-actions>

      <q-card-actions align="right" class="bank-card-footer q-px-lg q-py-sm bg-white row items-center justify-end" v-else-if="step === 'SUCCESS'">
        <q-btn
          unelevated
          label="Concluir e Voltar ao Painel"
          icon="check"
          color="positive"
          no-caps
          class="btn-bank-pay btn-pay-primary"
          style="min-width: 220px;"
          @click="finishSuccess"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { usePortalData } from '@/composables/usePortalData'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  installment: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'paid'])

const $q = useQuasar()
const authStore = useAuthStore()
const {
  customer, loans, allInstallments,
  formatMoney, formatDate, ordinalNumber, normalizeMpesaPhone, downloadPaymentRecibo
} = usePortalData()

const inst = computed(() => props.installment)

// Estados do fluxo: 'FORM' | 'WAITING_PIN' | 'SUCCESS' | 'FAILED'
const step = ref('FORM')
const selectedPlan = ref('TOTAL_MORA')
const paymentPhone = ref('')
const paymentAmount = ref(0)
const paying = ref(false)
const checkingStatus = ref(false)
const countdown = ref(60)
const mpesaTxId = ref(null)
const mpesaReceipt = ref(null)
const receiptData = ref(null)
const errorMessage = ref('')
let timerInterval = null
let pollInterval = null

// ---- CÁLCULOS FINANCEIROS ----
const paymentInstallmentValue = computed(() => Number(inst.value?.installment) || 0)
const paymentAlreadyPaid = computed(() => Number(inst.value?.paidAmount) || 0)
const paymentRemaining = computed(() =>
  Math.max(0, Math.round((paymentInstallmentValue.value - paymentAlreadyPaid.value) * 100) / 100)
)
const paymentLateInterest = computed(() => Number(inst.value?.latePaymentInterest || inst.value?.lateFee) || 0)
const paymentTotalDue = computed(() => Math.round((paymentRemaining.value + paymentLateInterest.value) * 100) / 100)

const paymentMinAmount = computed(() => {
  if (paymentRemaining.value <= 0) return 0
  const min15 = Math.round(paymentInstallmentValue.value * 0.15 * 100) / 100
  return Math.min(paymentRemaining.value, min15)
})

const nextPaymentInstallment = computed(() => {
  const current = inst.value
  if (!current) return null
  const index = allInstallments.value.findIndex(item => Number(item.id) === Number(current.id))
  return allInstallments.value.slice(index + 1).find(item => Number(item.status) !== 1) || null
})

const nextPaymentRemaining = computed(() => nextPaymentInstallment.value
  ? Math.max(0, Number(nextPaymentInstallment.value.installment || 0) - Number(nextPaymentInstallment.value.paidAmount || 0))
  : 0
)

const paymentAllowedMax = computed(() => Math.round((paymentTotalDue.value + nextPaymentRemaining.value) * 100) / 100)
const paymentExcessAmount = computed(() => Math.max(0, Math.round((Number(paymentAmount.value) - paymentTotalDue.value) * 100) / 100))
const isValidMpesaPhone = computed(() => /^258(84|85)\d{7}$/.test(paymentPhone.value))

const amountError = computed(() => {
  const v = Number(paymentAmount.value)
  if (!(v > 0) || paymentRemaining.value <= 0) return false
  return v < paymentMinAmount.value - 0.001 || v > paymentAllowedMax.value + 0.001
})

const canSubmitPayment = computed(() => {
  const v = Number(paymentAmount.value)
  if (!(v > 0) || amountError.value) return false
  return isValidMpesaPhone.value
})

const paymentTotalInstallments = computed(() => {
  const loan = loans.value.find(l => Number(l.id) === Number(inst.value?.loanId))
  return loan ? Number(loan.numberOfInstallments) || null : null
})

// ---- SIMULAÇÃO DA ALOCAÇÃO BANCÁRIA AO VIVO ----
const calculatedLateCovered = computed(() => {
  const amt = Number(paymentAmount.value) || 0
  return Math.min(amt, paymentLateInterest.value)
})

const calculatedCapitalCovered = computed(() => {
  const amt = Number(paymentAmount.value) || 0
  const afterLate = Math.max(0, amt - calculatedLateCovered.value)
  return Math.min(paymentRemaining.value, afterLate)
})

const calculatedRemainingAfter = computed(() => {
  return Math.max(0, Math.round((paymentRemaining.value - calculatedCapitalCovered.value) * 100) / 100)
})

const isFullSettlement = computed(() => {
  return calculatedRemainingAfter.value <= 0.01 && (calculatedLateCovered.value >= paymentLateInterest.value - 0.01)
})

// ---- SELEÇÃO DE PLANOS ----
function selectPlan(plan) {
  selectedPlan.value = plan
  if (plan === 'TOTAL_MORA') {
    paymentAmount.value = paymentTotalDue.value
  } else if (plan === 'TOTAL_INSTALLMENT') {
    paymentAmount.value = paymentRemaining.value
  } else if (plan === 'BASE_ONLY') {
    paymentAmount.value = paymentRemaining.value
  } else if (plan === 'MINIMUM') {
    paymentAmount.value = paymentMinAmount.value
  }
}

function onAmountCustomInput() {
  selectedPlan.value = 'CUSTOM'
}

function sanitizePhoneInput(value) {
  paymentPhone.value = String(value || '').replace(/[^0-9]/g, '').slice(0, 12)
}

function clearTimers() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Reset ao abrir
watch(() => props.modelValue, open => {
  if (open && inst.value) {
    clearTimers()
    step.value = 'FORM'
    mpesaTxId.value = null
    receiptData.value = null
    mpesaReceipt.value = null
    errorMessage.value = ''
    countdown.value = 60

    const remaining = Math.max(0, Math.round(((inst.value.installment || 0) - (inst.value.paidAmount || 0)) * 100) / 100)
    const lateFee = Number(inst.value.latePaymentInterest || inst.value.lateFee || 0)
    const totalDue = Math.round((remaining + lateFee) * 100) / 100

    // PREENCHE POR DEFEITO O TOTAL COM MORA (se houver mora) para quitação total e regularização imediata
    if (lateFee > 0) {
      selectedPlan.value = 'TOTAL_MORA'
      paymentAmount.value = totalDue
    } else {
      selectedPlan.value = 'TOTAL_INSTALLMENT'
      paymentAmount.value = remaining > 0 ? remaining : inst.value.installment || 0
    }

    paymentPhone.value = normalizeMpesaPhone(customer.value?.phone)
  } else {
    clearTimers()
  }
})

// Submissão M-Pesa C2B
async function processMpesaPayment() {
  const user = authStore.user
  if (!user || !inst.value || !canSubmitPayment.value) return

  paying.value = true
  errorMessage.value = ''

  try {
    const { data } = await api.post(`/api/portal/${user.companyId}/${user.id}/payments`, {
      installmentId: inst.value.id,
      loanId: inst.value.loanId,
      amount: Number(paymentAmount.value),
      method: 'mpesa',
      phone: paymentPhone.value
    })

    if (data.status === 'SUCCESS' && data.success) {
      receiptData.value = data.recibo || null
      mpesaReceipt.value = data.mpesaReceipt || data.reference
      step.value = 'SUCCESS'
    } else if (data.status === 'PENDING_PIN' || data.success) {
      mpesaTxId.value = data.mpesaTxId
      step.value = 'WAITING_PIN'
      startPinPolling()
    } else {
      errorMessage.value = data.message || 'Falha ao iniciar pagamento M-Pesa.'
      step.value = 'FAILED'
    }
  } catch (e) {
    errorMessage.value = e.response?.data?.message || 'Erro ao conectar ao M-Pesa.'
    step.value = 'FAILED'
  } finally {
    paying.value = false
  }
}

function startPinPolling() {
  clearTimers()
  countdown.value = 60

  timerInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearTimers()
      checkStatusOnce(true)
    }
  }, 1000)

  pollInterval = setInterval(() => {
    checkStatusOnce(false)
  }, 2500)
}

async function checkStatusOnce(isFinalTimeout = false) {
  if (!mpesaTxId.value) return

  try {
    const { data } = await api.get(`/api/mpesa/c2b/status/${mpesaTxId.value}`)
    if (data.success && data.status === 'SUCCESS') {
      clearTimers()
      receiptData.value = data.recibo
      mpesaReceipt.value = data.mpesaReceipt
      step.value = 'SUCCESS'
    } else if (data.status === 'FAILED') {
      clearTimers()
      errorMessage.value = data.responseDescription || 'Pagamento rejeitado pelo M-Pesa.'
      step.value = 'FAILED'
    } else if (isFinalTimeout) {
      clearTimers()
      errorMessage.value = 'Tempo limite de 60 segundos esgotado. Verifique o seu PIN no telemóvel e tente novamente.'
      step.value = 'FAILED'
    }
  } catch (err) {
    if (isFinalTimeout) {
      clearTimers()
      step.value = 'FAILED'
    }
  }
}

async function manualCheckStatus() {
  checkingStatus.value = true
  await checkStatusOnce(false)
  checkingStatus.value = false
}

function cancelWaiting() {
  clearTimers()
  step.value = 'FORM'
}

function retryPayment() {
  clearTimers()
  step.value = 'FORM'
}

function downloadReceipt() {
  if (receiptData.value?.id) {
    downloadPaymentRecibo(receiptData.value.id, receiptData.value.numero)
  }
}

function finishSuccess() {
  emit('update:modelValue', false)
  emit('paid')
}

function handleClose(val) {
  if (step.value === 'WAITING_PIN') return
  clearTimers()
  emit('update:modelValue', false)
}

onUnmounted(() => {
  clearTimers()
})
</script>

<style lang="scss" scoped>
.bank-dialog-wrapper {
  backdrop-filter: blur(4px);
}

.bank-payment-card {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  border-radius: 20px;
  background: #f8fafc;
  overflow: hidden;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.2);
}

.bank-card-header {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.bank-shield-avatar {
  background: rgba(255, 255, 255, 0.2);
}

.bank-card-body {
  background: #f8fafc;
}

/* CARDS DE STATUS */
.mora-alert-card {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-left: 5px solid #e53e3e;
  border-radius: 12px;
}

.mora-kpis .kpi-box {
  background: #ffffff;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  padding: 6px 4px;
}
.mora-kpis .mora-box {
  background: #fffaf0;
  border-color: #feebc8;
}
.mora-kpis .total-box {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.normal-due-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

/* SMART TILES */
.payment-options-grid {
  display: flex;
  flex-direction: column;
}

.option-tile {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  &.is-selected {
    border-color: #059669;
    background: #f0fdf4;
    box-shadow: 0 2px 8px rgba(5, 150, 105, 0.12);
  }
}

.radio-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  &.checked {
    background: #059669;
    border-color: #059669;
  }
}

/* AMOUNT FIELD */
.amount-input-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.amount-field-wrapper {
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  padding: 6px 12px;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: #059669;
    background: #ffffff;
  }
}

.currency-prefix {
  font-size: 16px;
  letter-spacing: 0.5px;
}

.bank-amount-input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 22px;
  color: #0f172a;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}

/* LIVE LEDGER BREAKDOWN */
.bank-ledger-breakdown {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.result-status-badge {
  &.is-full {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }
  &.is-partial {
    background: #fffaf0;
    border: 1px solid #feebc8;
  }
}

/* MPESA BOX */
.mpesa-account-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

/* RADAR WAITING PIN */
.radar-pulse-box {
  position: relative;
  width: 110px;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #059669;
  animation: radar-wave 2s infinite ease-out;
  opacity: 0.7;

  &.delay-1 {
    animation-delay: 0.7s;
  }
}

@keyframes radar-wave {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.3); opacity: 0; }
}

.countdown-badge {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 20px;
  width: fit-content;
}

.pin-steps-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #059669;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}

.bank-receipt-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

/* FOOTER */
.bank-card-footer {
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.03);
}

.btn-bank-cancel {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
}

.btn-bank-pay {
  min-height: 40px;
  min-width: 120px;
  padding: 0 22px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.3px;
}

.btn-bank-action {
  min-height: 40px;
  border-radius: 10px;
  font-weight: 600;
}

.btn-pay-primary {
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
}
</style>
