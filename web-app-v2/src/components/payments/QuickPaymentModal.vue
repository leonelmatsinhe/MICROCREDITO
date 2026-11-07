<template>
  <q-dialog v-model="isOpen" persistent transition-show="scale" transition-hide="fade">
    <q-card class="quick-pay-card column no-wrap">
      <!-- ═══════ HEADER ═══════ -->
      <q-card-section class="quick-pay-header row items-center q-py-sm q-px-md text-white">
        <q-avatar size="34px" class="bg-white text-green-9 q-mr-sm">
          <q-icon name="payments" size="20px" />
        </q-avatar>
        <div class="col">
          <div class="text-subtitle1 text-weight-bold" style="line-height: 1.2">
            Receber Pagamento Express
          </div>
          <div class="text-caption text-green-1" style="font-size: 11px">
            Cobrança rápida, liquidação e emissão de recibo sem desvios
          </div>
        </div>
        <q-btn flat round dense icon="close" class="text-white" @click="close" />
      </q-card-section>

      <!-- ═══════ BODY (SCROLLÁVEL) ═══════ -->
      <q-card-section class="col q-pa-md scroll quick-pay-body">
        <!-- ETAPA DE SUCESSO -->
        <div v-if="successState" class="text-center q-py-md">
          <q-avatar size="72px" color="green-1" text-color="positive" icon="check_circle" class="q-mb-md" />
          <div class="text-h6 text-weight-bold text-positive">Pagamento Concluído com Sucesso!</div>
          <div class="text-subtitle1 text-weight-bold text-dark q-mt-xs">
            {{ formatMoney(lastReceipt?.valor_pago || form.amount) }}
          </div>
          <div class="text-caption text-grey-7 q-mt-xs">
            Recibo Oficial: <strong>{{ lastReceipt?.numero || 'REC-CONFIRMADO' }}</strong>
            <span v-if="lastReceipt?.hash_at" class="text-grey-5"> · Selo Fiscal AT Certificado</span>
          </div>

          <div class="q-mt-md row justify-center q-gutter-sm">
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              icon="receipt"
              label="Ver Recibo (PDF)"
              @click="openViewer"
            />
            <q-btn
              outline
              rounded
              no-caps
              color="dark"
              icon="print"
              label="Talão Térmico (80mm)"
              @click="openThermal"
            />
            <q-btn
              outline
              rounded
              no-caps
              color="green-8"
              icon="chat"
              label="WhatsApp"
              @click="shareWhatsApp"
            />
          </div>

          <q-separator class="q-my-lg" />

          <div class="row justify-center q-gutter-sm">
            <q-btn
              flat
              rounded
              no-caps
              color="grey-8"
              icon="add"
              label="Receber Outro Pagamento"
              @click="resetForm"
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="positive"
              label="Concluir e Voltar"
              @click="finishAndClose"
            />
          </div>
        </div>

        <!-- FORMULÁRIO NORMAL -->
        <template v-else>
          <!-- 1. PESQUISA INTELIGENTE DO MUTUÁRIO -->
          <div class="section-badge q-mb-xs">1. Identificação do Mutuário</div>
          <q-select
            v-model="selectedCustomer"
            use-input
            fill-input
            hide-selected
            input-debounce="300"
            label="Pesquise por Nome, Nº de Conta, BI ou Telefone..."
            placeholder="Digite pelo menos 2 caracteres"
            outlined
            dense
            clearable
            option-value="id"
            :option-label="opt => (typeof opt === 'string' ? opt : (opt?.customerName || opt?.label || ''))"
            :options="customerOptions"
            :loading="loadingCustomers"
            @filter="onCustomerFilter"
            @update:model-value="onCustomerSelected"
            @clear="onCustomerClear"
            class="q-mb-sm"
          >
            <template v-slot:prepend>
              <q-icon name="person_search" color="primary" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey-6 text-caption">
                  Nenhum mutuário encontrado com esse critério.
                </q-item-section>
              </q-item>
            </template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps" class="q-py-xs">
                <q-item-section avatar top>
                  <q-avatar size="32px" color="primary" text-color="white" class="text-bold" style="font-size: 11px">
                    {{ (scope.opt.customerName || 'M').substring(0, 2).toUpperCase() }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold" style="font-size: 13px">
                    {{ scope.opt.customerName }}
                  </q-item-label>
                  <q-item-label caption class="text-grey-7">
                    Conta: <strong>#{{ scope.opt.accountNumber }}</strong> · Tel: {{ scope.opt.customerPhone || '—' }} · NUIT: {{ scope.opt.customerNuit || '—' }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- CARTÃO DO CLIENTE SELECCIONADO -->
          <div v-if="selectedCustomer" class="customer-card q-pa-sm q-mb-md">
            <div class="row items-center justify-between no-wrap">
              <div class="row items-center no-wrap">
                <q-avatar size="36px" color="green-8" text-color="white" class="text-bold q-mr-sm">
                  {{ (selectedCustomer.customerName || 'M').substring(0, 2).toUpperCase() }}
                </q-avatar>
                <div>
                  <div class="text-weight-bold text-dark" style="font-size: 13px">{{ selectedCustomer.customerName }}</div>
                  <div class="text-caption text-grey-7" style="font-size: 11px">
                    Conta #{{ selectedCustomer.accountNumber }} · Tel: <strong>{{ selectedCustomer.customerPhone || '—' }}</strong>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <q-btn flat round dense size="sm" icon="sync" color="primary" :loading="loadingLoans" @click="loadCustomerLoans(selectedCustomer.accountNumber)">
                  <q-tooltip>Recarregar prestações</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- SITUAÇÃO DOS CRÉDITOS DO MUTUÁRIO -->
            <div v-if="loadingLoans" class="text-center q-pa-sm">
              <q-spinner-dots size="24px" color="primary" />
              <span class="text-caption text-grey-6 q-ml-xs">A carregar créditos e prestações...</span>
            </div>

            <div v-else-if="!activeLoan" class="q-mt-xs q-pa-xs text-center text-amber-9 text-caption bg-amber-1 rounded-borders">
              <q-icon name="warning" size="14px" class="q-mr-xs" />
              Este mutuário não possui nenhum crédito activo ou com prestações em aberto.
            </div>

            <div v-else class="q-mt-xs">
              <div class="row items-center justify-between text-caption bg-grey-2 q-pa-xs rounded-borders">
                <span>Crédito activo: <strong>{{ money(activeLoan.contractedWithInterest || activeLoan.amount) }}</strong></span>
                <span :class="totalRemainingDebt > 0 ? 'text-negative text-weight-bold' : 'text-positive'">
                  Saldo devedor total: {{ money(totalRemainingDebt) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 2. SELEÇÃO DA PRESTAÇÃO & VALOR -->
          <template v-if="activeLoan && pendingInstallments.length > 0">
            <div class="section-badge q-mb-xs">2. Prestação a Liquidar</div>

            <!-- Selector de Prestação -->
            <q-select
              v-model="selectedInstallment"
              :options="installmentOptions"
              label="Seleccionar Parcela"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="onInstallmentChanged"
              class="q-mb-xs"
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps" dense>
                  <q-item-section>
                    <q-item-label class="text-weight-bold" style="font-size: 12px">
                      {{ scope.opt.label }}
                    </q-item-label>
                    <q-item-label caption class="text-grey-7" style="font-size: 10px">
                      Vencimento: {{ scope.opt.dueDate }} · Valor: {{ money(scope.opt.amount) }}
                      <span v-if="scope.opt.lateInterest > 0" class="text-negative font-weight-bold"> (+{{ money(scope.opt.lateInterest) }} mora)</span>
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge :color="scope.opt.isOverdue ? 'negative' : 'primary'" style="font-size: 9px">
                      {{ scope.opt.isOverdue ? `${scope.opt.delayDays}d atraso` : 'Em dia' }}
                    </q-badge>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- Resumo da Prestação Seleccionada -->
            <div v-if="selectedInstallmentData" class="installment-summary-box q-pa-sm q-mb-sm">
              <div class="row q-col-gutter-xs text-caption">
                <div class="col-4">
                  <div class="text-grey-6" style="font-size: 10px">Capital + Juros:</div>
                  <div class="text-weight-bold text-dark">{{ money(selectedInstallmentData.installment || 0) }}</div>
                </div>
                <div class="col-4 text-center">
                  <div class="text-grey-6" style="font-size: 10px">Juros de Mora:</div>
                  <div :class="calculatedMora > 0 ? 'text-negative text-weight-bold' : 'text-grey-7'">
                    {{ money(calculatedMora) }}
                  </div>
                </div>
                <div class="col-4 text-right">
                  <div class="text-grey-6" style="font-size: 10px">Total da Parcela:</div>
                  <div class="text-weight-bold text-positive" style="font-size: 13px">{{ money(totalInstallmentDue) }}</div>
                </div>
              </div>
            </div>

            <!-- Atalhos de Montante -->
            <div class="row q-gutter-xs q-mb-sm">
              <q-btn
                dense
                unelevated
                no-caps
                rounded
                size="sm"
                :color="amountMode === 'full_installment' ? 'green-9' : 'grey-3'"
                :text-color="amountMode === 'full_installment' ? 'white' : 'grey-9'"
                :label="`Pagar Parcela Actual (${money(totalInstallmentDue)})`"
                @click="setAmountMode('full_installment')"
              />
              <q-btn
                dense
                unelevated
                no-caps
                rounded
                size="sm"
                :color="amountMode === 'custom' ? 'green-9' : 'grey-3'"
                :text-color="amountMode === 'custom' ? 'white' : 'grey-9'"
                label="Valor Parcial / Livre"
                @click="setAmountMode('custom')"
              />
              <q-btn
                dense
                unelevated
                no-caps
                rounded
                size="sm"
                :color="amountMode === 'liquidate' ? 'green-9' : 'grey-3'"
                :text-color="amountMode === 'liquidate' ? 'white' : 'grey-9'"
                :label="`Liquidação Total (${money(totalRemainingDebt)})`"
                @click="setAmountMode('liquidate')"
              />
            </div>

            <!-- Input do Montante -->
            <q-input
              v-model.number="form.amount"
              type="number"
              outlined
              dense
              label="Montante a Pagar (MZN) *"
              prefix="MZN"
              class="q-mb-md"
              :rules="[val => Number(val) > 0 || 'O valor deve ser superior a zero']"
            />

            <!-- 3. CANAL E MÉTODO DE PAGAMENTO -->
            <div class="section-badge q-mb-xs">3. Canal de Pagamento</div>
            <div class="row q-col-gutter-xs q-mb-sm">
              <!-- Botão M-Pesa -->
              <div class="col-4">
                <q-card
                  flat
                  bordered
                  class="cursor-pointer method-card text-center q-pa-xs"
                  :class="{ 'method-card-active': form.paymentMethod === 7 }"
                  @click="selectMethod(7)"
                >
                  <q-icon name="smartphone" size="20px" :color="form.paymentMethod === 7 ? 'positive' : 'grey-7'" />
                  <div class="text-weight-bold" :class="form.paymentMethod === 7 ? 'text-positive' : 'text-grey-8'" style="font-size: 11px">
                    M-Pesa API
                  </div>
                  <div class="text-caption text-grey-6" style="font-size: 9px">Prompt PIN no tel.</div>
                </q-card>
              </div>

              <!-- Botão Numerário -->
              <div class="col-4">
                <q-card
                  flat
                  bordered
                  class="cursor-pointer method-card text-center q-pa-xs"
                  :class="{ 'method-card-active': form.paymentMethod === 1 }"
                  @click="selectMethod(1)"
                >
                  <q-icon name="payments" size="20px" :color="form.paymentMethod === 1 ? 'positive' : 'grey-7'" />
                  <div class="text-weight-bold" :class="form.paymentMethod === 1 ? 'text-positive' : 'text-grey-8'" style="font-size: 11px">
                    Numerário
                  </div>
                  <div class="text-caption text-grey-6" style="font-size: 9px">Caixa de Balcão</div>
                </q-card>
              </div>

              <!-- Botão Banco / POS -->
              <div class="col-4">
                <q-card
                  flat
                  bordered
                  class="cursor-pointer method-card text-center q-pa-xs"
                  :class="{ 'method-card-active': form.paymentMethod === 3 }"
                  @click="selectMethod(3)"
                >
                  <q-icon name="account_balance" size="20px" :color="form.paymentMethod === 3 ? 'positive' : 'grey-7'" />
                  <div class="text-weight-bold" :class="form.paymentMethod === 3 ? 'text-positive' : 'text-grey-8'" style="font-size: 11px">
                    Banco / POS
                  </div>
                  <div class="text-caption text-grey-6" style="font-size: 9px">Depósito / TPA</div>
                </q-card>
              </div>
            </div>

            <!-- OPÇÃO M-PESA: PROMPT C2B VODACOM -->
            <div v-if="form.paymentMethod === 7" class="q-pa-sm bg-green-0 rounded-borders border-green q-mb-sm">
              <div class="row items-center q-col-gutter-xs">
                <div class="col-12 col-sm-7">
                  <q-input
                    v-model="form.mpesaPhone"
                    outlined
                    dense
                    label="Telemóvel Vodacom (84/85) *"
                    placeholder="84xxxxxxx ou 85xxxxxxx"
                    prefix="+258"
                    mask="## ### ####"
                    unmasked-value
                    :disable="mpesaWaiting"
                    :rules="[val => validateVodacomPhone(val)]"
                  />
                </div>
                <div class="col-12 col-sm-5">
                  <div class="text-caption text-grey-7" style="font-size: 10px; line-height: 1.2">
                    O telemóvel do cliente receberá imediatamente o pedido oficial de PIN da Vodacom M-Pesa.
                  </div>
                </div>
              </div>

              <!-- ESTADO DO POLLING M-PESA -->
              <div v-if="mpesaWaiting" class="text-center q-pa-sm bg-white rounded-borders q-mt-xs">
                <q-spinner-hourglass size="24px" color="positive" />
                <div class="text-weight-bold text-positive q-mt-xs" style="font-size: 12px">
                  {{ mpesaStatusMessage }}
                </div>
                <div class="text-caption text-grey-6" style="font-size: 10px">
                  Tempo restante: {{ mpesaTimer }}s · Não feche esta janela
                </div>
              </div>
            </div>

            <!-- OPÇÃO BANCO / POS: CONTA E REFERÊNCIA -->
            <div v-else-if="form.paymentMethod === 3 || form.paymentMethod === 4 || form.paymentMethod === 5" class="q-pa-sm bg-blue-0 rounded-borders q-mb-sm">
              <div class="row q-col-gutter-xs">
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="form.bankAccountId"
                    :options="bankAccountOptions"
                    label="Conta Bancária Destino *"
                    outlined
                    dense
                    emit-value
                    map-options
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.tranzactionReference"
                    outlined
                    dense
                    label="Nº de Referência / Talão *"
                    placeholder="Ex: REF9847123"
                    :rules="[val => !!val || 'A referência bancária é obrigatória']"
                  />
                </div>
              </div>
            </div>

            <!-- OPÇÃO NUMERÁRIO: CONTA DE CAIXA -->
            <div v-else class="q-pa-sm bg-grey-1 rounded-borders q-mb-sm">
              <div class="row q-col-gutter-xs items-center">
                <div class="col-12 col-sm-8">
                  <q-select
                    v-model="form.bankAccountId"
                    :options="bankAccountOptions"
                    label="Conta de Caixa / Balcão *"
                    outlined
                    dense
                    emit-value
                    map-options
                  />
                </div>
                <div class="col-12 col-sm-4 text-caption text-grey-7" style="font-size: 10px">
                  O valor dá entrada directa no caixa aberto do operador.
                </div>
              </div>
            </div>
          </template>
        </template>
      </q-card-section>

      <!-- ═══════ FOOTER DE ACÇÕES ═══════ -->
      <q-card-section v-if="!successState" class="q-py-sm q-px-md bg-grey-1 row items-center justify-between">
        <q-btn flat no-caps label="Cancelar" color="grey-8" @click="close" />
        <q-btn
          v-if="form.paymentMethod === 7"
          unelevated
          rounded
          no-caps
          color="positive"
          icon="send"
          label="Cobrar via M-Pesa (Pedir PIN)"
          :loading="submitting || mpesaWaiting"
          :disable="!canSubmit"
          @click="submitMpesaPayment"
          class="text-weight-bold"
        />
        <q-btn
          v-else
          unelevated
          rounded
          no-caps
          color="positive"
          icon="check_circle"
          label="Confirmar e Emitir Recibo"
          :loading="submitting"
          :disable="!canSubmit"
          @click="submitDirectPayment"
          class="text-weight-bold"
        />
      </q-card-section>
    </q-card>

    <!-- Visualizador PDF do Recibo -->
    <ReciboViewerDialog v-model="viewerOpen" :recibo="viewerRecibo" />

    <!-- Talão Térmico 80mm -->
    <ThermalReceiptDialog v-model="thermalOpen" :recibo="viewerRecibo" />
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useBankStore } from '@/stores/bank'
import { api } from '@/boot/axios'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import ReciboViewerDialog from '@/components/recibos/ReciboViewerDialog.vue'
import ThermalReceiptDialog from '@/components/recibos/ThermalReceiptDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'payment-success'])

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const bankStore = useBankStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Estados do formulário
const loadingCustomers = ref(false)
const customerOptions = ref([])
const selectedCustomer = ref(null)

const loadingLoans = ref(false)
const customerLoans = ref([])
const activeLoan = ref(null)
const pendingInstallments = ref([])
const selectedInstallment = ref(null)

const amountMode = ref('full_installment') // 'full_installment' | 'custom' | 'liquidate'

const form = ref({
  amount: 0,
  paymentMethod: 7, // 7: M-Pesa, 1: Numerário, 3: Banco
  mpesaPhone: '',
  bankAccountId: null,
  tranzactionReference: '',
  notes: ''
})

const submitting = ref(false)
const successState = ref(false)
const lastReceipt = ref(null)

// Estados M-Pesa Polling
const mpesaWaiting = ref(false)
const mpesaTimer = ref(60)
const mpesaStatusMessage = ref('A enviar pedido...')
let mpesaInterval = null
let mpesaPollCount = 0

// Modais de Recibo
const viewerOpen = ref(false)
const thermalOpen = ref(false)
const viewerRecibo = ref(null)

// Inicialização de contas bancárias
watch(isOpen, async (val) => {
  if (val) {
    resetForm()
    if (authStore.companyId) {
      await bankStore.fetchReembolsoAccounts(authStore.companyId)
      // Seleciona primeira conta disponível
      if (bankStore.reembolsoAccounts?.length > 0) {
        form.value.bankAccountId = bankStore.reembolsoAccounts[0].id
      }
    }
  }
})

// Filtro de clientes
async function onCustomerFilter(val, update, abort) {
  if (!val || val.trim().length < 2) {
    abort()
    return
  }
  loadingCustomers.value = true
  try {
    const { data } = await api.get(`/api/customers/${authStore.companyId}`, {
      params: { search: val.trim(), limit: 10 }
    })
    update(() => {
      customerOptions.value = (data?.success && Array.isArray(data.result))
        ? data.result.map(c => ({ ...c, label: c.customerName, value: c.id }))
        : []
    })
  } catch {
    abort()
  } finally {
    loadingCustomers.value = false
  }
}

function onCustomerClear() {
  onCustomerSelected(null)
}

// Seleção de cliente
async function onCustomerSelected(customer) {
  selectedCustomer.value = customer
  if (!customer) {
    customerLoans.value = []
    activeLoan.value = null
    pendingInstallments.value = []
    return
  }

  // Preenche telefone M-Pesa padrão
  if (customer.customerPhone) {
    form.value.mpesaPhone = customer.customerPhone.replace(/\D/g, '').slice(-9)
  }

  await loadCustomerLoans(customer.accountNumber)
}

// Carregar créditos e parcelas
async function loadCustomerLoans(accountNumber) {
  if (!accountNumber) return
  loadingLoans.value = true
  try {
    const { data } = await api.get(`/api/loan/${accountNumber}`)
    const loans = (data?.success && Array.isArray(data.result)) ? data.result : []
    customerLoans.value = loans

    // Prioriza empréstimo activo (status 1 ou aprovado)
    activeLoan.value = loans.find(l => Number(l.loanStatus) === 1 || Number(l.loanStatus) === 0) || loans[0] || null

    if (activeLoan.value) {
      await loadAmortization(activeLoan.value.id)
    } else {
      pendingInstallments.value = []
    }
  } catch (err) {
    console.error('Erro ao carregar créditos:', err)
  } finally {
    loadingLoans.value = false
  }
}

// Carregar plano de amortização
async function loadAmortization(loanId) {
  try {
    const { data } = await api.get(`/api/loan/amortization/${loanId}`)
    const allInst = (data?.success && Array.isArray(data.result)) ? data.result : []
    // Prestações pendentes ou em atraso (status !== 1)
    pendingInstallments.value = allInst.filter(i => Number(i.status) !== 1)

    if (pendingInstallments.value.length > 0) {
      // Seleciona a primeira pendente
      selectedInstallment.value = pendingInstallments.value[0].id
      onInstallmentChanged(selectedInstallment.value)
    }
  } catch (err) {
    console.error('Erro ao carregar amortização:', err)
  }
}

const selectedInstallmentData = computed(() => {
  return pendingInstallments.value.find(i => Number(i.id) === Number(selectedInstallment.value)) || null
})

const calculatedMora = computed(() => {
  const inst = selectedInstallmentData.value
  if (!inst) return 0
  return Number(inst.penaltyAmount || inst.latePaymentInterest || 0)
})

const totalInstallmentDue = computed(() => {
  const inst = selectedInstallmentData.value
  if (!inst) return 0
  return Number(inst.installment || 0) + calculatedMora.value
})

const totalRemainingDebt = computed(() => {
  return pendingInstallments.value.reduce((acc, inst) => {
    return acc + Number(inst.installment || 0) + Number(inst.penaltyAmount || inst.latePaymentInterest || 0)
  }, 0)
})

const installmentOptions = computed(() => {
  return pendingInstallments.value.map(i => {
    const isOverdue = Number(i.delayDays) > 0 || Number(i.status) === -1
    return {
      label: `${i.installmentOrder}ª Prestação — ${formatMoney(Number(i.installment) + Number(i.penaltyAmount || 0))}`,
      value: i.id,
      amount: Number(i.installment || 0),
      lateInterest: Number(i.penaltyAmount || 0),
      dueDate: formatDateShort(i.dueDate),
      isOverdue,
      delayDays: Number(i.delayDays || 0)
    }
  })
})

function onInstallmentChanged(instId) {
  selectedInstallment.value = instId
  if (amountMode.value === 'full_installment') {
    form.value.amount = totalInstallmentDue.value
  } else if (amountMode.value === 'liquidate') {
    form.value.amount = totalRemainingDebt.value
  }
}

function setAmountMode(mode) {
  amountMode.value = mode
  if (mode === 'full_installment') {
    form.value.amount = totalInstallmentDue.value
  } else if (mode === 'liquidate') {
    form.value.amount = totalRemainingDebt.value
  }
}

function selectMethod(methodId) {
  form.value.paymentMethod = methodId
  const accounts = bankStore.byMethod(methodId)
  if (accounts.length > 0) {
    form.value.bankAccountId = accounts[0].id
  }
}

const bankAccountOptions = computed(() => {
  return (bankStore.reembolsoAccounts || []).map(a => ({
    label: `${a.name || a.bank_name} (${a.account_number || a.type})`,
    value: a.id
  }))
})

function validateVodacomPhone(val) {
  const p = String(val || '').replace(/\D/g, '')
  const raw9 = p.length > 9 ? p.slice(-9) : p
  if (raw9.length === 9 && (raw9.startsWith('84') || raw9.startsWith('85'))) return true
  return 'Número M-Pesa deve ser rede Vodacom (84 ou 85 + 7 dígitos)'
}

const canSubmit = computed(() => {
  if (!selectedCustomer.value || !activeLoan.value || !selectedInstallment.value) return false
  if (Number(form.value.amount) <= 0) return false
  if (form.value.paymentMethod === 7) {
    const raw9 = String(form.value.mpesaPhone || '').replace(/\D/g, '').slice(-9)
    if (raw9.length !== 9 || !(raw9.startsWith('84') || raw9.startsWith('85'))) return false
  }
  if ((form.value.paymentMethod === 3 || form.value.paymentMethod === 4 || form.value.paymentMethod === 5) && !form.value.tranzactionReference) return false
  return true
})

// Gerador de UUID para Idempotency-Key
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// Submeter Pagamento Directo (Numerário / Banco)
async function submitDirectPayment() {
  if (!canSubmit.value) return
  submitting.value = true

  try {
    const payload = {
      companyId: authStore.companyId,
      accountNumber: selectedCustomer.value.accountNumber,
      amortizationLoanId: selectedInstallment.value,
      amount: form.value.amount,
      interestRateAmount: selectedInstallmentData.value?.interest || 0,
      phoneNumber: selectedCustomer.value.customerPhone || form.value.mpesaPhone,
      tranzactionReference: form.value.tranzactionReference || `BALCAO-${Date.now().toString().slice(-6)}`,
      paymentMethod: form.value.paymentMethod,
      bank_account_id: form.value.bankAccountId,
      paymentDate: new Date().toISOString().slice(0, 10),
      description: `Reembolso prestação #${selectedInstallment.value} - Conta ${selectedCustomer.value.accountNumber}`
    }

    const { data } = await api.post('/api/tranzaction', payload, {
      headers: {
        'idempotency-key': generateUUID()
      }
    })

    if (data?.success) {
      // Obter ou gerar recibo
      const txId = data.tranzactionId || data.result?.id || data.result?.tranzactionId
      if (txId) {
        await fetchReceiptForTx(txId)
      } else {
        lastReceipt.value = {
          numero: data.reciboNumero || 'REC-CONFIRMADO',
          valor_pago: form.value.amount,
          customer_name: selectedCustomer.value.customerName,
          account_number: selectedCustomer.value.accountNumber
        }
      }
      successState.value = true
      emit('payment-success')
    } else {
      $q.notify({ type: 'negative', message: data?.message || 'Erro ao processar pagamento', position: 'top' })
    }
  } catch (error) {
    console.error('Erro no pagamento:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao registar pagamento no servidor',
      position: 'top'
    })
  } finally {
    submitting.value = false
  }
}

// Submeter Pagamento M-Pesa C2B
async function submitMpesaPayment() {
  if (!canSubmit.value) return
  submitting.value = true
  mpesaWaiting.value = true
  mpesaTimer.value = 60
  mpesaStatusMessage.value = 'A contactar a Vodacom M-Pesa...'

  try {
    const { data } = await api.post('/api/mpesa/c2b/initiate', {
      companyId: authStore.companyId,
      customerId: selectedCustomer.value.id,
      loanId: activeLoan.value.id,
      amortizationLoanId: selectedInstallment.value,
      amount: form.value.amount,
      phone: `258${String(form.value.mpesaPhone || '').replace(/\D/g, '').slice(-9)}`
    })

    if (!data?.success) {
      throw new Error(data?.message || 'Não foi possível iniciar transacção M-Pesa')
    }

    if (data.status === 'SUCCESS') {
      clearInterval(mpesaInterval)
      mpesaWaiting.value = false
      submitting.value = false
      if (data.recibo) {
        lastReceipt.value = { ...data.recibo, customer_phone: selectedCustomer.value?.customerPhone || form.value.mpesaPhone }
        viewerRecibo.value = lastReceipt.value
      } else if (data.tranzactionId) {
        await fetchReceiptForTx(data.tranzactionId)
      }
      successState.value = true
      emit('payment-success')
      return
    }
    const mpesaTxId = data.mpesaTxId || data.mpesaTransactionId
    mpesaStatusMessage.value = 'Pedido de PIN enviado ao telemóvel do cliente. A aguardar validação...'

    // Iniciar contagem decrescente e polling de status
    mpesaPollCount = 0
    clearInterval(mpesaInterval)
    mpesaInterval = setInterval(async () => {
      mpesaTimer.value -= 2
      mpesaPollCount++

      if (mpesaTimer.value <= 0 || mpesaPollCount > 30) {
        clearInterval(mpesaInterval)
        mpesaWaiting.value = false
        submitting.value = false
        $q.notify({
          type: 'warning',
          message: 'Tempo limite esgotado. O cliente demorou a digitar o PIN ou cancelou a operação.',
          position: 'top'
        })
        return
      }

      try {
        const statusResp = await api.get(`/api/mpesa/c2b/status/${mpesaTxId}`)
        const txStatus = statusResp.data?.status || statusResp.data?.transaction?.status

        if (txStatus === 'SUCCESS') {
          clearInterval(mpesaInterval)
          mpesaWaiting.value = false
          submitting.value = false

          // Carrega recibo da transacção M-Pesa
          const txId = statusResp.data?.tranzactionId || statusResp.data?.transaction?.tranzactionId
          if (txId) {
            await fetchReceiptForTx(txId)
          }
          successState.value = true
          emit('payment-success')
        } else if (txStatus === 'FAILED') {
          clearInterval(mpesaInterval)
          mpesaWaiting.value = false
          submitting.value = false
          $q.notify({
            type: 'negative',
            message: statusResp.data?.responseDescription || statusResp.data?.transaction?.responseDesc || 'Pagamento M-Pesa recusado pelo cliente ou saldo insuficiente.',
            position: 'top'
          })
        }
      } catch {
        // Ignora erros transitórios de rede no polling
      }
    }, 2500)
  } catch (error) {
    mpesaWaiting.value = false
    submitting.value = false
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || error.message || 'Erro ao iniciar M-Pesa C2B',
      position: 'top'
    })
  }
}

// Obter Recibo Oficial
async function fetchReceiptForTx(tranzactionId) {
  try {
    const { data } = await api.post(`/api/recibos/gerar/${tranzactionId}`, {
      companyId: authStore.companyId
    })
    if (data?.success && data.result) {
      lastReceipt.value = {
        ...data.result,
        customer_phone: selectedCustomer.value?.customerPhone || form.value.mpesaPhone
      }
      viewerRecibo.value = lastReceipt.value
    }
  } catch (err) {
    console.error('Erro ao buscar recibo:', err)
  }
}

function openViewer() {
  viewerRecibo.value = lastReceipt.value
  viewerOpen.value = true
}

function openThermal() {
  viewerRecibo.value = lastReceipt.value
  thermalOpen.value = true
}

function shareWhatsApp() {
  const phone = (lastReceipt.value?.customer_phone || selectedCustomer.value?.customerPhone || '').replace(/\D/g, '')
  const total = formatMoney(lastReceipt.value?.valor_pago || form.value.amount)
  const num = lastReceipt.value?.numero || 'Oficial'
  const text = encodeURIComponent(
    `*${companyStore.company?.companyName || 'MBR Microcrédito'}*\n` +
    `Olá ${selectedCustomer.value?.customerName || 'Cliente'},\n` +
    `Confirmamos o recebimento de *${total}*.\n` +
    `Recibo: *${num}*\n` +
    `Obrigado!`
  )
  const target = phone.length >= 9 ? `https://wa.me/258${phone.slice(-9)}?text=${text}` : `https://wa.me/?text=${text}`
  window.open(target, '_blank')
}

function resetForm() {
  clearInterval(mpesaInterval)
  mpesaWaiting.value = false
  submitting.value = false
  successState.value = false
  lastReceipt.value = null
  selectedCustomer.value = null
  customerLoans.value = []
  activeLoan.value = null
  pendingInstallments.value = []
  selectedInstallment.value = null
  amountMode.value = 'full_installment'
  form.value = {
    amount: 0,
    paymentMethod: 7,
    mpesaPhone: '',
    bankAccountId: bankStore.reembolsoAccounts?.[0]?.id || null,
    tranzactionReference: '',
    notes: ''
  }
}

function finishAndClose() {
  resetForm()
  isOpen.value = false
}

function close() {
  clearInterval(mpesaInterval)
  isOpen.value = false
}

function money(v) {
  return formatMoney(Number(v) || 0)
}

onUnmounted(() => {
  clearInterval(mpesaInterval)
})
</script>

<style scoped>
.quick-pay-card {
  width: 580px;
  max-width: 95vw;
  max-height: 92vh;
  border-radius: 16px;
  background: #ffffff;
}

.quick-pay-header {
  background: linear-gradient(135deg, #0b3d2e 0%, #15803d 100%);
}

.quick-pay-body {
  background: #f8fafc;
}

.section-badge {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
}

.customer-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.installment-summary-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.method-card {
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  transition: all 0.15s ease;
}

.method-card:hover {
  border-color: #15803d;
  background: #f0fdf4;
}

.method-card-active {
  border: 2px solid #15803d !important;
  background: #f0fdf4 !important;
}

.border-green {
  border: 1px solid #86efac;
}
</style>
