<template>
  <div class="cr-page">
    <!-- ===================== SIMULAÇÃO DE CRÉDITO (calculadora conectada) ===================== -->
    <section class="cr-card sim-wrap" :class="{ 'is-locked': kycLocked }">
      <div class="row items-center no-wrap q-mb-md">
        <q-avatar size="40px" color="primary" text-color="white" class="q-mr-md">
          <q-icon name="calculate" size="22px" />
        </q-avatar>
        <div>
          <div class="cr-title">Simulação de crédito &amp; enquadramento prudencial</div>
          <div class="cr-muted">Cálculo Price com paridade exacta ao desembolso. A prestação não deve ultrapassar 1/3 do rendimento.</div>
        </div>
      </div>

      <div class="row q-col-gutter-lg items-stretch">
        <!-- TETO PRUDENCIAL: o limite que guia o gestor -->
        <div class="col-12 col-md-4">
          <div class="ceiling-box" :class="{ 'is-over': capacityExceeded }">
            <div class="ceiling-box__label">
              <q-icon name="verified_user" size="16px" class="q-mr-xs" />
              Teto prudencial da prestação (1/3)
            </div>
            <div class="ceiling-box__value">{{ formatMoney(store.maxCapacity) }}</div>
            <div class="ceiling-box__sub">
              Rendimento comprovado: <strong>{{ formatMoney(store.customer?.customerMonthlySalary || 0) }}</strong>
            </div>
            <div v-if="maxRecommendedAmount > 0" class="ceiling-box__hint">
              Montante máximo para {{ form.prestacoes }}x a {{ (selectedRate * 100).toFixed(1) }}%:
              <strong>{{ formatMoney(maxRecommendedAmount) }}</strong>
            </div>
          </div>
        </div>

        <!-- CAMPOS + BOTÃO COLADO -->
        <div class="col-12 col-md-8">
          <q-form ref="simForm" class="row q-col-gutter-sm items-start" @submit.prevent="simulateLoan">
            <div class="col-12 col-sm-4">
              <q-input
                v-model.number="form.capital"
                outlined
                dense
                label="Montante *"
                type="number"
                min="0"
                prefix="MZN"
                :disable="kycLocked"
                :rules="[val => val > 0 || 'Informe o montante']"
              >
                <template v-slot:prepend><q-icon name="payments" size="18px" color="primary" /></template>
              </q-input>
            </div>
            <div class="col-6 col-sm-3">
              <q-select
                v-model="form.prestacoes"
                outlined
                dense
                :options="numeroPrestacoes"
                label="Prazo *"
                emit-value
                map-options
                :disable="kycLocked"
                :rules="[val => !!val || 'Escolha o prazo']"
              >
                <template v-slot:prepend><q-icon name="event_repeat" size="18px" color="primary" /></template>
              </q-select>
            </div>
            <div class="col-6 col-sm-3">
              <q-select
                v-model="form.juros"
                outlined
                dense
                :options="rateOptions"
                label="Taxa *"
                emit-value
                map-options
                :disable="kycLocked"
                :rules="[val => !!val || 'Escolha a taxa']"
              >
                <template v-slot:prepend><q-icon name="percent" size="18px" color="primary" /></template>
                <template v-slot:selected-item="scope">{{ scope.opt.label }}</template>
              </q-select>
            </div>
            <div class="col-12 col-sm-2">
              <q-btn
                type="submit"
                color="primary"
                icon="play_arrow"
                label="Simular"
                unelevated
                no-caps
                class="full-width sim-btn"
                :loading="simulating"
                :disable="kycLocked"
              />
            </div>
          </q-form>

          <!-- Resultado em tempo real -->
          <div class="live-result" :class="liveStateClass">
            <div class="row items-center no-wrap">
              <q-icon :name="liveStateIcon" size="22px" class="q-mr-sm" />
              <div class="col">
                <div class="live-result__title">{{ liveStateTitle }}</div>
                <div class="live-result__text">{{ liveStateText }}</div>
              </div>
              <div v-if="effectiveInstallment > 0" class="text-right">
                <div class="live-result__label">Prestação estimada</div>
                <div class="live-result__value">{{ formatMoney(effectiveInstallment) }}</div>
              </div>
            </div>
            <q-linear-progress
              v-if="effectiveInstallment > 0"
              :value="Math.min(1, capacityRatio)"
              rounded
              size="8px"
              :color="capacityColor"
              track-color="grey-3"
              class="q-mt-sm"
            />
            <div v-if="effectiveInstallment > 0" class="row justify-between live-result__scale q-mt-xs">
              <span>0</span>
              <span>{{ Math.round(capacityRatio * 100) }}% do teto</span>
              <span>Teto {{ formatMoney(store.maxCapacity) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- OVERLAY DE BLOQUEIO KYC -->
      <div v-if="kycLocked" class="lock-overlay">
        <div class="lock-overlay__box">
          <q-avatar size="56px" class="lock-overlay__icon">
            <q-icon name="lock" size="30px" />
          </q-avatar>
          <div class="lock-overlay__title">Complete o processo KYC para desbloquear a simulação</div>
          <div class="lock-overlay__text">
            Documento em falta: <strong>{{ store.kycMissing.join(', ') || '—' }}</strong>
          </div>
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="folder_shared"
            label="Ir para Documentos"
            class="q-mt-md lock-overlay__btn"
            @click="$emit('go-to-tab', 'docs')"
          />
        </div>
      </div>
    </section>

    <!-- Divisória clara entre simulação e histórico -->
    <div class="cr-divider">
      <span><q-icon name="history" size="16px" class="q-mr-xs" />Contratos &amp; histórico de empréstimos</span>
    </div>

    <!-- BLOQUEIO KYC: alerta a sério -->
    <section v-if="!store.isKycComplete" class="kyc-alert q-mb-lg">
      <div class="row items-center q-col-gutter-md">
        <div class="col-12 col-md row no-wrap items-start">
          <q-avatar size="44px" class="kyc-alert__icon q-mr-md">
            <q-icon name="gpp_maybe" size="24px" />
          </q-avatar>
          <div>
            <div class="kyc-alert__title">Desembolso bloqueado — Dossier KYC incompleto</div>
            <div class="kyc-alert__text">
              Documento em falta: <strong>{{ store.kycMissing.join(', ') || '—' }}</strong>.
              Nenhum crédito pode ser submetido ou desembolsado até o dossier estar completo.
            </div>
          </div>
        </div>
        <div class="col-12 col-md-auto">
          <q-btn
            unelevated
            no-caps
            color="deep-orange-9"
            text-color="white"
            icon="upload_file"
            label="Ir para Documentos"
            class="kyc-alert__btn"
            @click="$emit('go-to-tab', 'docs')"
          />
        </div>
      </div>
    </section>

    <div v-if="store.loans.length === 0" class="cr-card text-center q-pa-xl text-grey-5">
      <q-icon name="receipt_long" size="40px" />
      <div class="text-caption q-mt-sm">Ainda não há créditos registados.</div>
    </div>

    <!-- CONTRATOS PENDENTES: cartões de pendência (não de histórico) -->
    <section v-for="loan in pendingLoans" :key="`p-${loan.id}`" class="pending-contract q-mb-lg">
      <div class="row items-start q-col-gutter-lg">
        <div class="col-12 col-md-5">
          <div class="row items-center q-gutter-x-sm q-mb-sm">
            <span class="pending-contract__no">Contrato #{{ loan.id }}</span>
            <span class="rate-seal">{{ (Number(loan.interestRate) * 100).toFixed(1) }}%/mês</span>
            <span class="status-pill">
              <q-icon name="hourglass_top" size="13px" class="q-mr-xs" />
              {{ loan.numberOfInstallments }}X · PENDENTE
            </span>
          </div>
          <div class="cr-label">Capital solicitado</div>
          <div class="pending-contract__amount">{{ formatMoney(loan.amount) }}</div>
        </div>

        <div class="col-12 col-md-4">
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <div class="cr-label">Total da dívida</div>
              <div class="metric text-negative">{{ formatMoney(store.loanMetrics[Number(loan.id)]?.contractTotal || loan.amount) }}</div>
            </div>
            <div class="col-6">
              <div class="cr-label">Prestação estimada</div>
              <div class="metric" :class="loanInstallment(loan) > store.maxCapacity ? 'text-negative' : ''">
                {{ formatMoney(loanInstallment(loan)) }}
              </div>
            </div>
            <div class="col-6">
              <div class="cr-label">Data de concessão</div>
              <div class="metric">{{ formatDate(loan.disbursementDate || loan.dateCreated) }}</div>
            </div>
            <div class="col-6">
              <div class="cr-label">Gestor</div>
              <div class="metric">{{ getManagerName(loan.creditManager) }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-3 column q-gutter-y-sm">
          <q-btn
            v-if="!store.isKycComplete"
            unelevated
            no-caps
            color="deep-orange-9"
            icon="lock_open"
            label="Completar KYC"
            class="full-width action-lg"
            @click="$emit('go-to-tab', 'docs')"
          />
          <q-btn
            v-else
            unelevated
            no-caps
            color="primary"
            icon="task_alt"
            label="Aprovar e desembolsar"
            class="full-width action-lg"
            @click="emit('approve-loan', loan)"
          />
          <q-btn
            outline
            no-caps
            color="primary"
            icon="table_chart"
            label="Ver Plano"
            class="full-width"
            :loading="planPreviewLoading && planPreviewLoan?.id === loan.id"
            @click="previewLoanPlan(loan)"
          />
          <q-btn flat dense no-caps color="grey-8" icon="shield" label="Garantias" class="full-width" @click="$emit('view-guarantees', loan)" />
        </div>
      </div>

      <!-- Sector BM: texto completo, sem corte -->
      <div class="sector-box q-mt-md">
        <q-icon :name="getSectorIcon(loan.loanDescription)" size="18px" color="primary" class="q-mr-sm" />
        <div>
          <span class="sector-box__label">Sector BM / finalidade:</span>
          <span class="sector-box__text">{{ loan.loanDescription || 'Não indicado' }}</span>
        </div>
      </div>
    </section>

    <!-- HISTÓRICO (activos, terminados, rejeitados) -->
    <div v-if="historyLoans.length" class="row q-col-gutter-md">
      <div v-for="loan in historyLoans" :key="loan.id" class="col-12 col-sm-6 col-lg-4">
        <div class="cr-card history-card full-height column justify-between">
          <div>
            <div class="row items-center justify-between no-wrap q-mb-sm">
              <div class="row items-center q-gutter-x-xs">
                <span class="text-weight-bold cr-ink">Contrato #{{ loan.id }}</span>
                <span class="rate-seal rate-seal--sm">{{ (Number(loan.interestRate) * 100).toFixed(1) }}%/mês</span>
              </div>
              <q-badge :color="loanStatus(loan.status).color" :label="loanStatus(loan.status).label" rounded class="text-weight-bold" />
            </div>
            <div class="cr-label">Capital desembolsado</div>
            <div class="history-card__amount">{{ formatMoney(loan.amount) }}</div>
            <div class="sector-box sector-box--sm q-mt-sm">
              <q-icon :name="getSectorIcon(loan.loanDescription)" size="16px" color="primary" class="q-mr-xs" />
              <span class="sector-box__text">{{ loan.loanDescription || 'Não indicado' }}</span>
            </div>
            <q-separator class="q-my-sm" />
            <div class="row q-col-gutter-xs text-caption">
              <div class="col-6"><div class="cr-label">Total dívida</div><div class="text-weight-bold text-negative">{{ formatMoney(store.loanMetrics[Number(loan.id)]?.contractTotal || loan.amount) }}</div></div>
              <div class="col-6 text-right"><div class="cr-label">Prazo</div><div class="text-weight-bold cr-ink">{{ loan.numberOfInstallments }}x</div></div>
              <div class="col-6 q-mt-xs"><div class="cr-label">Concessão</div><div class="cr-ink">{{ formatDate(loan.disbursementDate || loan.dateCreated) }}</div></div>
              <div class="col-6 q-mt-xs text-right"><div class="cr-label">Gestor</div><div class="cr-ink ellipsis">{{ getManagerName(loan.creditManager) }}</div></div>
            </div>
          </div>
          <div class="row items-center q-gutter-x-xs q-mt-md">
            <q-btn
              unelevated dense no-caps color="primary" icon="table_chart" label="Ver Plano" class="q-px-sm"
              :disable="![1, 3].includes(Number(loan.status))"
              @click="$emit('view-plan', loan)"
            />
            <q-btn flat dense no-caps color="grey-8" icon="shield" label="Garantias" @click="$emit('view-guarantees', loan)" />
            <q-btn
              flat dense no-caps color="grey-8" icon="info" label="Ficha"
              :disable="![1, 3].includes(Number(loan.status))"
              @click="$emit('loan-info', loan)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== DIALOG: PLANO DO CONTRATO PENDENTE (só leitura) ===================== -->
    <q-dialog v-model="showPlanPreview">
      <q-card style="width: 860px; max-width: 95vw; border-radius: 16px">
        <q-card-section class="row items-center bg-primary text-white">
          <q-icon name="table_chart" size="22px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Plano previsto — Contrato #{{ planPreviewLoan?.id }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="cr-muted q-mb-sm">
            Plano Price indicativo para {{ formatMoney(planPreviewLoan?.amount) }} em {{ planPreviewLoan?.numberOfInstallments }}x.
            As datas definitivas são fixadas no desembolso.
          </div>
          <q-table
            :rows="planPreviewRows" :columns="simColumns" row-key="installmentOrder"
            flat dense hide-bottom :rows-per-page-options="[0]" style="font-size: 12px; max-height: 60vh"
          >
            <template v-slot:body-cell-amortization="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td></template>
            <template v-slot:body-cell-rateAmount="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td></template>
            <template v-slot:body-cell-installment="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td></template>
            <template v-slot:body-cell-remainingBalance="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.remainingBalance) }}</q-td></template>
            <template v-slot:body-cell-dueDate="props"><q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td></template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ===================== DIALOG: PLANO SIMULADO + SUBMISSÃO ===================== -->
    <q-dialog v-model="showSimModal" persistent maximized>
      <q-card style="border-radius: 16px">
        <q-card-section class="row items-center q-pb-none bg-primary text-white">
          <q-icon name="table_chart" size="24px" class="q-mr-sm" />
          <div class="text-h6">Plano de Amortização — Simulação</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showSimModal = false" />
        </q-card-section>
        <q-card-section>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6 col-sm-3" v-for="item in simSummary" :key="item.label">
              <div class="summary-card">
                <div class="text-caption text-grey-5" style="font-size: 10px">{{ item.label }}</div>
                <div class="text-weight-bold" :class="item.class">{{ item.value }}</div>
              </div>
            </div>
          </div>
          <q-banner class="q-mb-md" rounded :class="capacityExceeded ? 'bg-orange-1 text-orange-10' : 'bg-green-1 text-green-10'">
            <template v-slot:avatar>
              <q-icon :name="capacityExceeded ? 'warning' : 'check_circle'" :color="capacityExceeded ? 'orange' : 'positive'" size="20px" />
            </template>
            <div class="text-weight-medium" style="font-size: 13px">
              {{ capacityExceeded ? 'Prestação acima da capacidade' : 'Dentro da capacidade' }}
            </div>
            <div class="text-caption">
              Prestação: {{ formatMoney(estimatedInstallment) }} | Limite: {{ formatMoney(store.maxCapacity) }}
            </div>
          </q-banner>
          <q-table :rows="simRows" :columns="simColumns" row-key="installmentOrder" flat dense hide-bottom :rows-per-page-options="[0]" class="q-mb-md" style="font-size: 12px">
            <template v-slot:body-cell-amortization="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td></template>
            <template v-slot:body-cell-rateAmount="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td></template>
            <template v-slot:body-cell-installment="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td></template>
            <template v-slot:body-cell-remainingBalance="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.remainingBalance) }}</q-td></template>
            <template v-slot:body-cell-dueDate="props"><q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td></template>
          </q-table>

          <q-separator class="q-mb-md" />
          <div class="text-subtitle1 text-weight-bold q-mb-xs">
            <q-icon name="send" size="18px" color="primary" class="q-mr-xs" />Submissão &amp; Enquadramento BM
          </div>
          <div class="text-caption text-grey-6 q-mb-md">
            Selecione a finalidade regulamentar exigida pelo Reporte Trimestral do Banco de Moçambique (Secção 2.1.3).
          </div>
          <q-form ref="submitFormRef" class="row q-col-gutter-md" @submit.prevent>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.loanDescription"
                dense
                outlined
                emit-value
                map-options
                label="Finalidade do crédito (Sector Regulamentar BM) *"
                :options="purposeOptions"
                :rules="[val => !!val || 'Selecione o sector regulamentar do BM']"
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon :name="scope.opt.icon" color="primary" size="20px" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold">{{ scope.opt.value }}</q-item-label>
                      <q-item-label caption style="font-size: 11px">{{ scope.opt.description }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template v-slot:selected-item="scope">
                  <div class="row items-center no-wrap">
                    <q-icon :name="getSectorIcon(scope.opt.value)" size="18px" color="primary" class="q-mr-xs" />
                    <span class="text-weight-bold">{{ scope.opt.value }}</span>
                  </div>
                </template>
              </q-select>
            </div>
            <div class="col-6 col-sm-3">
              <q-input v-model="form.dateCreated" dense outlined label="Data de Concessão *" type="date" :max="todayDate" :rules="[val => !!val || 'Informe a data']" />
            </div>
            <div class="col-6 col-sm-3">
              <q-select v-model="form.creditManager" dense outlined :options="managerOptions" label="Gestor de Crédito *" emit-value map-options :rules="[val => !!val || 'Escolha o gestor']" />
            </div>
          </q-form>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showSimModal = false" />
          <q-btn
            unelevated
            label="Submeter Crédito"
            color="positive"
            icon="send"
            no-caps
            rounded
            :loading="store.submitting"
            :disable="!canSubmit || !store.isKycComplete"
            @click="onSubmitClick"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== DIALOG: PARECER DE EXCESSO DE CAPACIDADE ===================== -->
    <q-dialog v-model="showCapacityDialog" persistent>
      <q-card style="border-radius: 16px; min-width: 480px; max-width: 95vw">
        <q-card-section class="row items-center bg-negative text-white">
          <q-icon name="report" size="24px" class="q-mr-sm" />
          <div class="text-h6">Excesso de Capacidade — Parecer Obrigatório</div>
        </q-card-section>
        <q-card-section>
          <q-banner class="bg-orange-1 text-orange-10 q-mb-md" rounded dense>
            A prestação de <strong>{{ formatMoney(estimatedInstallment) }}</strong> excede o limite de
            <strong>{{ formatMoney(store.maxCapacity) }}</strong> (1/3 do rendimento). Justifique com parecer válido.
          </q-banner>
          <q-form ref="capacityFormRef" class="q-gutter-md" @submit.prevent>
            <q-select
              v-model="capacityForm.reason"
              dense outlined
              label="Motivo do excesso *"
              :options="capacityReasons"
              :rules="[val => !!val || 'Seleccione o motivo']"
            />
            <q-input
              v-model="capacityForm.observation"
              dense outlined
              type="textarea"
              rows="4"
              label="Parecer / justificativa (mínimo 50 caracteres) *"
              :rules="[val => (String(val || '').trim().length >= 50) || 'O parecer deve ter no mínimo 50 caracteres']"
              counter
              maxlength="1000"
            />
            <div class="text-caption text-grey-6">{{ String(capacityForm.observation || '').trim().length }}/50 caracteres mínimos</div>
            <q-file
              v-model="capacityForm.parecerFile"
              dense outlined
              label="Parecer em PDF (obrigatório)"
              accept=".pdf"
              :rules="[val => !!val || 'Anexe o parecer em PDF']"
            >
              <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
            </q-file>
          </q-form>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showCapacityDialog = false" />
          <q-btn
            unelevated
            label="Confirmar e Submeter"
            color="negative"
            icon="send"
            no-caps
            rounded
            :loading="store.submitting"
            :disable="!capacityFormValid"
            @click="confirmExcessSubmit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const $q = useQuasar()
const router = useRouter()
const store = useMutuarioStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const emit = defineEmits(['go-to-tab', 'view-plan', 'view-guarantees', 'loan-info', 'approve-loan'])

const simulating = ref(false)
const showSimModal = ref(false)
const showCapacityDialog = ref(false)
const estimatedInstallment = ref(0)
const simRows = ref([])
const submitFormRef = ref(null)
const capacityFormRef = ref(null)

const form = ref({
  capital: 0, prestacoes: null, juros: null, creditManager: null,
  loanDescription: '', capacityExcessObservation: '',
  dateCreated: new Date().toISOString().split('T')[0]
})

const capacityForm = ref({ reason: null, observation: '', parecerFile: null })
const capacityReasons = [
  'Rendimento comprovado adicional (extractos/outras fontes)',
  'Comerciante com fluxo de caixa sazonal',
  'Histórico de crédito anterior sem incumprimento',
  'Garantia adicional apresentada pelo mutuário',
  'Outro (justificado no parecer)'
]

const todayDate = new Date().toISOString().split('T')[0]
const numeroPrestacoes = Array.from({ length: 18 }, (_, i) => ({ label: `${i + 1} prestação${i > 0 ? 's' : ''}`, value: i + 1 }))
const rateOptions = ref([{ label: 'Taxa de juros', value: null }])
const managerOptions = ref([{ label: 'Selecionar Gestor', value: null }])

const purposeOptions = [
  { label: 'Comércio (Retalho, Grossista, Lojas, Mercados)', value: 'Comércio', icon: 'storefront', description: 'Actividades comerciais e venda de mercadorias' },
  { label: 'Agricultura (Cultivo, Cereais, Hortícolas, Frutas)', value: 'Agricultura', icon: 'agriculture', description: 'Produção agrícola e exploração de culturas' },
  { label: 'Pecuária (Criação de Animais, Avicultura, Gado, Suínos)', value: 'Pecuária', icon: 'pets', description: 'Criação pecuária, produção de carne e ovos' },
  { label: 'Indústria (Transformação, Fabrico, Produção, Moagens)', value: 'Indústria', icon: 'factory', description: 'Actividade fabril, transformação e manufatura' },
  { label: 'Serviços (Transportes, Educação, Saúde, Turismo, Oficinas)', value: 'Serviços', icon: 'room_service', description: 'Prestação de serviços a terceiros' },
  { label: 'Consumo (Despesas Pessoais, Agregado Familiar, Habitação)', value: 'Consumo', icon: 'shopping_bag', description: 'Necessidades individuais e do lar' },
  { label: 'Outros (Outras Actividades Económicas)', value: 'Outros', icon: 'category', description: 'Outros sectores regulamentares residuais' }
]

function getSectorIcon(sector) {
  const icons = {
    'Comércio': 'storefront',
    'Agricultura': 'agriculture',
    'Pecuária': 'pets',
    'Indústria': 'factory',
    'Serviços': 'room_service',
    'Consumo': 'shopping_bag',
    'Outros': 'category'
  }
  return icons[sector] || 'category'
}

const selectedRate = computed(() => {
  const rate = settingsStore.rates.find(r => r.id === form.value.juros)
  return rate ? Number(rate.tax) : 0
})

// Rótulo SEMPRE com % a.m. e % a.a. (taxa mensal × 12)
const rateLabel = (tax) => `${(tax * 100).toFixed(1)}% a.m. (${(tax * 12 * 100).toFixed(0)}% a.a.)`

// ── BLOQUEIO KYC: não se simula o que não pode ser desembolsado ──
const kycLocked = computed(() => !store.isKycComplete)

// Prestação Price calculada em tempo real (indicativa; o oficial vem do backend em /simulate)
function priceInstallment(amount, rate, n) {
  const P = Number(amount) || 0
  const i = Number(rate) || 0
  const k = Number(n) || 0
  if (P <= 0 || k <= 0) return 0
  if (i <= 0) return P / k
  return (P * i) / (1 - Math.pow(1 + i, -k))
}
const liveInstallment = computed(() => priceInstallment(form.value.capital, selectedRate.value, form.value.prestacoes))
// Resultado do backend prevalece; ao alterar os campos volta-se ao cálculo em tempo real
const effectiveInstallment = computed(() => estimatedInstallment.value > 0 ? estimatedInstallment.value : liveInstallment.value)
watch(() => [form.value.capital, form.value.prestacoes, form.value.juros], () => { estimatedInstallment.value = 0 })

// Montante máximo que respeita o teto para o prazo/taxa escolhidos
const maxRecommendedAmount = computed(() => {
  const n = Number(form.value.prestacoes) || 0
  const i = Number(selectedRate.value) || 0
  const cap = Number(store.maxCapacity) || 0
  if (!n || cap <= 0) return 0
  if (i <= 0) return cap * n
  return cap * (1 - Math.pow(1 + i, -n)) / i
})

const capacityRatio = computed(() =>
  store.maxCapacity > 0 && effectiveInstallment.value > 0
    ? effectiveInstallment.value / store.maxCapacity
    : 0
)

const liveStateClass = computed(() => {
  if (effectiveInstallment.value <= 0) return 'is-idle'
  return capacityRatio.value > 1 ? 'is-over' : capacityRatio.value >= 0.8 ? 'is-near' : 'is-ok'
})
const liveStateIcon = computed(() => ({ 'is-idle': 'info', 'is-over': 'error', 'is-near': 'warning', 'is-ok': 'check_circle' }[liveStateClass.value]))
const liveStateTitle = computed(() => ({
  'is-idle': 'Preencha montante, prazo e taxa',
  'is-over': 'Prestação acima do teto prudencial',
  'is-near': 'Próximo do limite prudencial',
  'is-ok': 'Dentro da capacidade de endividamento'
}[liveStateClass.value]))
const liveStateText = computed(() => {
  if (liveStateClass.value === 'is-idle') return 'A prestação é calculada automaticamente enquanto digita.'
  const diff = effectiveInstallment.value - store.maxCapacity
  if (diff > 0) return `Excede o teto em ${formatMoney(diff)}. Reduza o montante ou aumente o prazo — caso contrário será exigido parecer.`
  return `Margem restante de ${formatMoney(-diff)} face ao teto.`
})

// ── CONTRATOS: pendências separadas do histórico ──
const pendingLoans = computed(() => store.loans.filter(l => Number(l.status) === 0).sort((a, b) => Number(b.id) - Number(a.id)))
const historyLoans = computed(() => store.loans.filter(l => Number(l.status) !== 0))
const loanInstallment = (loan) => priceInstallment(loan.amount, loan.interestRate, loan.numberOfInstallments)

// ── PRÉ-VISUALIZAÇÃO DO PLANO DE UM CONTRATO PENDENTE (backend /simulate) ──
const showPlanPreview = ref(false)
const planPreviewLoan = ref(null)
const planPreviewRows = ref([])
const planPreviewLoading = ref(false)
async function previewLoanPlan(loan) {
  planPreviewLoan.value = loan
  planPreviewLoading.value = true
  try {
    const result = await store.simulate({
      amount: Number(loan.amount),
      installments: Number(loan.numberOfInstallments),
      monthlyRate: Number(loan.interestRate),
      dateCreated: String(loan.dateCreated || todayDate).slice(0, 10)
    })
    planPreviewRows.value = result.plan || []
    showPlanPreview.value = true
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Não foi possível calcular o plano', position: 'top' })
  } finally {
    planPreviewLoading.value = false
  }
}
const capacityColor = computed(() =>
  capacityRatio.value > 1 ? 'negative' : capacityRatio.value >= 0.6 ? 'warning' : 'positive'
)
const capacityExceeded = computed(() => capacityRatio.value > 1)

const capacityFormValid = computed(() =>
  !!capacityForm.value.reason &&
  String(capacityForm.value.observation || '').trim().length >= 50 &&
  !!capacityForm.value.parecerFile
)

const canSubmit = computed(() =>
  Number(form.value.capital) > 0 &&
  !!form.value.prestacoes &&
  !!form.value.juros &&
  !!form.value.creditManager &&
  !!String(form.value.loanDescription || '').trim() &&
  !!form.value.dateCreated
)

const simSummary = computed(() => [
  { label: 'Capital', value: formatMoney(form.value.capital), class: 'text-primary' },
  { label: 'Taxa', value: rateLabel(selectedRate.value), class: '' },
  { label: 'Prestações', value: `${form.value.prestacoes}x`, class: '' },
  { label: 'Total a pagar', value: formatMoney(store.simulation?.totalToPay || 0), class: 'text-positive' }
])

const simColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center' },
  { name: 'amortization', label: 'Amortização', field: 'amortization', align: 'right' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right' },
  { name: 'remainingBalance', label: 'Saldo', field: 'remainingBalance', align: 'right' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right' }
]

function loanStatus(status) {
  const s = Number(status)
  return { 0: { color: 'orange', label: 'Pendente' }, 1: { color: 'positive', label: 'Activo' }, '-1': { color: 'negative', label: 'Rejeitado' }, 3: { color: 'positive', label: 'Terminado' } }[s] || { color: 'grey', label: 'Desconhecido' }
}
function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : '—' }

function getManagerName(val) {
  if (!val) return '—'
  const u = (settingsStore.users || []).find(x => String(x.id) === String(val) || String(x.name) === String(val))
  if (u && u.name) return u.name
  const m = managerOptions.value.find(x => String(x.value) === String(val))
  if (m && m.label) return m.label
  return isNaN(val) ? val : `Gestor #${val}`
}

// ── SIMULAÇÃO: cálculo no BACKEND via POST /api/loan/simulate ──
async function simulateLoan() {
  if (kycLocked.value) {
    $q.notify({ type: 'warning', message: 'Complete o processo KYC para desbloquear a simulação', position: 'top' })
    return
  }
  const capital = Number(form.value.capital)
  const prestacoes = Number(form.value.prestacoes)
  const rate = Number(selectedRate.value)
  if (!(capital > 0) || !Number.isInteger(prestacoes) || prestacoes < 1 || !(rate > 0)) {
    $q.notify({ type: 'warning', message: 'Preencha montante, prazo e taxa', position: 'top' })
    return
  }
  simulating.value = true
  try {
    const result = await store.simulate({
      amount: capital,
      installments: prestacoes,
      monthlyRate: rate,
      dateCreated: form.value.dateCreated
    })
    simRows.value = result.plan || []
    estimatedInstallment.value = result.installment || 0
    showSimModal.value = true
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao simular', position: 'top' })
  } finally {
    simulating.value = false
  }
}

function onSubmitClick() {
  // Excesso de capacidade → QDialog obrigatório com parecer (mín. 50 chars + PDF)
  if (capacityExceeded.value) {
    capacityForm.value = { reason: null, observation: '', parecerFile: null }
    showCapacityDialog.value = true
    return
  }
  submitLoan()
}

async function confirmExcessSubmit() {
  const valid = await capacityFormRef.value.validate()
  if (!valid) return
  // Upload do parecer em PDF (via /api/document/upload) + parecer no crédito
  try {
    let parecerUrl = ''
    if (capacityForm.value.parecerFile) {
      if (!api?.post) throw new Error('API não inicializada')
      const fd = new FormData()
      fd.append('file', capacityForm.value.parecerFile)
      const { data: up } = await api.post('/api/document/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (up?.success) parecerUrl = up.documentFileUrl || ''
    }
    const fullObservation = `[${capacityForm.value.reason}] ${String(capacityForm.value.observation).trim()}${parecerUrl ? ` (parecer: ${parecerUrl})` : ''}`
    form.value.capacityExcessObservation = fullObservation
    showCapacityDialog.value = false
    await submitLoan(fullObservation)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao anexar parecer', position: 'top' })
  }
}

async function submitLoan(observationOverride) {
  const valid = await submitFormRef.value.validate()
  if (!valid) return
  try {
    const data = await store.submitLoan({
      accountNumber: store.customer.accountNumber,
      companyId: store.customer.companyId,
      amount: Number(form.value.capital),
      numberOfInstallments: Number(form.value.prestacoes),
      interestRate: Number(selectedRate.value),
      creditManager: form.value.creditManager,
      loanDescription: String(form.value.loanDescription || '').trim(),
      capacityExcessObservation: observationOverride || form.value.capacityExcessObservation || '',
      dateCreated: form.value.dateCreated,
      status: 0
    })
    if (data.success === false) throw new Error(data.message || 'Erro ao submeter')
    // Fluxo com parecer de excesso: mensagem específica + redirect para a lista de mutuários
    const comParecer = !!observationOverride
    $q.notify({
      type: 'positive',
      message: comParecer ? 'Crédito submetido com parecer para aprovação' : 'Crédito submetido com sucesso',
      position: 'top'
    })
    showCapacityDialog.value = false
    showSimModal.value = false
    form.value.capital = 0
    form.value.prestacoes = null
    form.value.juros = null
    form.value.loanDescription = ''
    estimatedInstallment.value = 0
    simRows.value = []
    await store.fetchLoans()
    if (comParecer) router.push('/mutuarios')
  } catch (e) {
    // KYC_INCOMPLETE devolvido pelo backend (defesa em profundidade)
    if (e.response?.data?.error === 'KYC_INCOMPLETE') {
      $q.notify({ type: 'negative', message: `KYC incompleto: ${e.response.data.missing?.join(', ')}`, position: 'top' })
    } else {
      $q.notify({ type: 'negative', message: e.response?.data?.message || e.message || 'Erro ao submeter crédito', position: 'top' })
    }
  }
}

onMounted(async () => {
  try {
    await settingsStore.fetchRates(authStore.companyId)
    // Rótulo sempre em % a.m. e % a.a.
    rateOptions.value = settingsStore.rates.map(r => ({ label: rateLabel(Number(r.tax)), value: r.id }))
  } catch { /* silent */ }
  try {
    await settingsStore.fetchUsers(authStore.companyId)
    managerOptions.value = settingsStore.users
      .filter(u => u.userRole === 1 || u.userRole === 3)
      .map(u => ({ label: u.name, value: u.id }))
    const currentUser = managerOptions.value.find(m => Number(m.value) === Number(authStore.user?.id))
    if (!form.value.creditManager && currentUser) form.value.creditManager = currentUser.value
  } catch { /* silent */ }
})
</script>

<style lang="scss" scoped>
$ink: #0f172a;
$ink-2: #334155;
$muted: #64748b;
$line: #e2e8f0;

.cr-page {
  padding: 20px 20px 96px;
}

.cr-card {
  background: #ffffff;
  border: 1px solid $line;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03);
}

.cr-title {
  font-size: 16px;
  font-weight: 800;
  color: $ink;
  letter-spacing: -0.2px;
}
.cr-muted {
  font-size: 12.5px;
  color: $muted;
  line-height: 1.5;
}
.cr-label {
  font-size: 11px;
  font-weight: 600;
  color: $muted;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.cr-ink {
  color: $ink;
}

.sim-wrap {
  position: relative;
  &.is-locked {
    filter: none;
  }
}

.ceiling-box {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1.5px solid #a7f3d0;
  border-radius: 14px;
  padding: 16px 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.25s ease;

  &__label {
    font-size: 12px;
    font-weight: 700;
    color: #065f46;
    display: flex;
    align-items: center;
  }
  &__value {
    font-size: 26px;
    font-weight: 900;
    color: #047857;
    letter-spacing: -0.5px;
    margin: 4px 0 2px;
  }
  &__sub {
    font-size: 12px;
    color: #047857;
    line-height: 1.4;
  }
  &__hint {
    font-size: 11px;
    color: #065f46;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed #6ee7b7;
  }

  &.is-over {
    background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%);
    border-color: #fca5a5;
    .ceiling-box__label { color: #991b1b; }
    .ceiling-box__value { color: #b91c1c; }
    .ceiling-box__sub { color: #991b1b; }
    .ceiling-box__hint { color: #991b1b; border-color: #fca5a5; }
  }
}

.sim-btn {
  height: 40px;
  border-radius: 10px;
  font-weight: 700;
}

.live-result {
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: 10px;
  transition: all 0.2s ease;

  &__title {
    font-size: 13.5px;
    font-weight: 800;
  }
  &__text {
    font-size: 12px;
    line-height: 1.4;
    margin-top: 2px;
  }
  &__label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  &__value {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: -0.4px;
    line-height: 1.1;
  }
  &__scale {
    font-size: 10.5px;
    font-weight: 600;
    opacity: 0.8;
  }

  &.is-idle {
    background: #f8fafc;
    border: 1px solid $line;
    color: $muted;
    .live-result__title { color: $ink-2; }
  }
  &.is-ok {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #065f46;
    .live-result__title { color: #047857; }
    .live-result__value { color: #047857; }
  }
  &.is-near {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    .live-result__title { color: #b45309; }
    .live-result__value { color: #b45309; }
  }
  &.is-over {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    .live-result__title { color: #b91c1c; }
    .live-result__value { color: #b91c1c; }
  }
}

.lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  &__box {
    text-align: center;
    max-width: 440px;
    padding: 24px;
  }
  &__icon {
    background: #fee2e2;
    color: #b91c1c;
    margin-bottom: 12px;
  }
  &__title {
    font-size: 18px;
    font-weight: 800;
    color: $ink;
    margin-bottom: 6px;
  }
  &__text {
    font-size: 13px;
    color: #64748b;
  }
  &__btn {
    height: 44px;
    border-radius: 10px;
    font-weight: 700;
    padding: 0 24px;
  }
}

.cr-divider {
  display: flex;
  align-items: center;
  margin: 32px 0 20px;
  color: $muted;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $line;
  }
  span {
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
  }
}

.kyc-alert {
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-left: 6px solid #c2410c;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 4px 16px rgba(194, 65, 12, 0.08);

  &__icon {
    background: #c2410c;
    color: #ffffff;
  }
  &__title {
    font-size: 16px;
    font-weight: 800;
    color: #7c2d12;
  }
  &__text {
    font-size: 13px;
    color: #9a3412;
    margin-top: 4px;
    line-height: 1.45;
  }
  &__btn {
    border-radius: 10px;
    height: 42px;
    padding: 0 20px;
    font-weight: 800;
  }
}

.pending-contract {
  background: #ffffff;
  border: 1.5px solid #fcd34d;
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: 0 6px 20px rgba(180, 83, 9, 0.08);

  &__no {
    font-size: 13px;
    font-weight: 800;
    color: $ink;
  }
  &__amount {
    font-size: 30px;
    font-weight: 900;
    color: $ink;
    letter-spacing: -0.8px;
    line-height: 1.15;
    margin-top: 4px;
  }
}

.rate-seal {
  background: #f1f5f9;
  color: $ink;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid $line;

  &--sm {
    font-size: 10px;
    padding: 2px 6px;
  }
}

.status-pill {
  background: #b45309;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
}

.metric {
  font-size: 14px;
  font-weight: 800;
  color: $ink;
  margin-top: 2px;
}

.action-lg {
  height: 44px;
  border-radius: 10px;
  font-weight: 800;
}

.sector-box {
  background: #f8fafc;
  border: 1px solid $line;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  align-items: center;

  &__label {
    font-size: 11px;
    font-weight: 700;
    color: $muted;
    text-transform: uppercase;
    margin-right: 6px;
  }
  &__text {
    font-size: 12.5px;
    font-weight: 600;
    color: $ink;
    word-break: break-word;
  }

  &--sm {
    padding: 6px 10px;
  }
}

.history-card {
  border-radius: 14px;
  &__amount {
    font-size: 20px;
    font-weight: 800;
    color: $ink;
    margin-top: 2px;
  }
}

body.body--dark {
  .cr-card, .history-card, .pending-contract, .sector-box {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .cr-title, .cr-ink, .metric, .pending-contract__amount, .history-card__amount, .sector-box__text {
    color: #f1f5f9;
  }
  .lock-overlay {
    background: rgba(15, 23, 42, 0.88);
  }
}
</style>
