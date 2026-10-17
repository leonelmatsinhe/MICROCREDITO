<template>
  <div class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- ===================== GARANTIAS (por crédito — selector próprio) ===================== -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="border-radius: 12px" class="full-height">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle1 text-weight-bold">
                <q-icon name="security" size="18px" class="q-mr-xs text-orange" />Garantias
              </div>
              <q-space />
              <q-select
                v-model="selectedLoanId"
                dense outlined
                :options="loanOptions"
                label="Crédito"
                emit-value map-options
                style="min-width: 180px"
                :disable="loanOptions.length <= 1"
              />
              <q-btn
                v-if="selectedLoanId"
                unelevated color="orange" icon="add" label="Adicionar" no-caps rounded size="sm" class="q-ml-sm"
                @click="showGuarantees = true"
              />
            </div>

            <div v-if="!selectedLoanId" class="text-center q-pa-lg text-grey-5">
              <q-icon name="lock" size="36px" />
              <div class="text-caption q-mt-sm">
                {{ store.loansLoading ? 'A carregar os créditos do mutuário...' : 'Nenhum crédito deste mutuário disponível para garantias.' }}
              </div>
              <div v-if="!store.loansLoading" class="text-caption text-grey-6">
                As garantias são registadas por crédito; crie/abra um crédito para começar.
              </div>
            </div>

            <template v-else>
              <!-- Cobertura: garantias vs total a pagar (capital + juros) -->
              <q-banner v-if="coverage" dense rounded class="q-mb-sm" :class="coverage.covered ? 'bg-green-1 text-green-9' : 'bg-red-1 text-red-9'">
                <template v-slot:avatar>
                  <q-icon :name="coverage.covered ? 'verified' : 'warning'" :color="coverage.covered ? 'positive' : 'negative'" />
                </template>
                <div class="text-caption">
                  <template v-if="coverage.reason === 'NO_GUARANTEES'">
                    <strong>Nenhuma garantia registada.</strong>
                    O cadastro de garantias é obrigatório antes de aprovar: registe pelo menos uma
                    garantia de <strong>{{ formatMoney(coverage.requiredTotal) }} MZN</strong>
                    (total a pagar = capital + juros).
                  </template>
                  <template v-else>
                    Garantias: <strong>{{ formatMoney(coverage.guaranteesTotal) }}</strong> de {{ formatMoney(coverage.requiredTotal) }} MZN (crédito + juros)
                    <strong v-if="!coverage.covered">— faltam {{ formatMoney(coverage.shortfall) }} MZN para poder aprovar este crédito.</strong>
                    <strong v-else>— cobertura suficiente ({{ coverage.coveragePct }}%).</strong>
                  </template>
                </div>
              </q-banner>
              <q-skeleton v-if="guaranteesLoading" type="rect" height="120px" />
              <div v-else-if="guarantees.length === 0" class="text-center q-pa-lg text-grey-5">
                <q-icon name="shield" size="36px" />
                <div class="text-caption q-mt-sm">Nenhuma garantia registada para o crédito #{{ selectedLoanId }}.</div>
              </div>
              <div v-else>
                <q-card v-for="g in guarantees" :key="g.id" flat bordered class="q-mb-sm" style="border-radius: 10px">
                  <q-card-section class="row items-center q-py-sm">
                    <q-icon name="inventory_2" color="orange" size="22px" class="q-mr-sm" />
                    <div class="col">
                      <div class="text-weight-medium" style="font-size: 13px">{{ g.guaranteeName || g.name || `Garantia #${g.id}` }}</div>
                      <div class="text-caption text-grey-5 app-text-dark">
                        {{ g.guaranteeValue ? `${formatMoney(g.guaranteeValue)}` : '' }}
                        {{ g.guaranteeDescription || g.description || '' }}
                      </div>
                    </div>
                    <q-img
                      v-if="guaranteePhotoUrl(g)"
                      :src="guaranteePhotoUrl(g)"
                      style="width: 46px; height: 46px; border-radius: 8px; cursor: pointer"
                      @click="openPhoto(guaranteePhotoUrl(g))"
                    />
                  </q-card-section>
                </q-card>
              </div>
            </template>
          </q-card-section>
        </q-card>
      </div>

      <!-- ===================== RECIBOS FISCAIS ===================== -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="border-radius: 12px" class="full-height">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle1 text-weight-bold">
                <q-icon name="receipt_long" size="18px" class="q-mr-xs text-positive" />Recibos Fiscais
              </div>
              <q-space />
              <q-badge color="grey-6" rounded>{{ recibos.length }} recibo(s)</q-badge>
            </div>

            <q-skeleton v-if="recibosLoading" type="rect" height="120px" />
            <div v-else-if="recibos.length === 0" class="text-center q-pa-lg text-grey-5">
              <q-icon name="receipt" size="36px" />
              <div class="text-caption q-mt-sm">Nenhum recibo emitido. Os recibos são gerados automaticamente em cada pagamento.</div>
            </div>
            <div v-else>
              <q-card v-for="r in recibos" :key="r.id" flat bordered class="q-mb-sm" style="border-radius: 10px">
                <q-card-section class="row items-center q-py-sm">
                  <q-icon name="receipt" color="positive" size="22px" class="q-mr-sm" />
                  <div class="col">
                    <div class="text-weight-medium" style="font-size: 13px">{{ r.numero || `Recibo #${r.id}` }}</div>
                    <div class="text-caption text-grey-5 app-text-dark">
                      {{ formatMoney(r.valor_pago ?? r.totalAmount ?? r.amount) }} · {{ formatDate(r.created_at || r.createdAt) }}
                    </div>
                  </div>
                  <q-chip :color="r.status === 'ANULADO' ? 'negative' : 'positive'" text-color="white" dense>
                    {{ r.status || 'EMITIDO' }}
                  </q-chip>
                  <q-btn flat round dense icon="picture_as_pdf" size="sm" color="negative" @click="openReciboPdf(r)">
                    <q-tooltip>Descarregar PDF</q-tooltip>
                  </q-btn>
                </q-card-section>
              </q-card>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal de garantias (reutiliza o modal existente do sistema) -->
    <GuaranteesModal v-model="showGuarantees" :loan-id="selectedLoanId" @update:model-value="onGuaranteesModalToggle" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useLoansStore } from '@/stores/loans'
import { useCustomerStore } from '@/stores/customers'
import { api } from '@/boot/axios'
import { formatMoney } from '@/utils/formatters'
import GuaranteesModal from '@/components/modals/GuaranteesModal.vue'

const store = useMutuarioStore()
const loansStore = useLoansStore()
const customerStore = useCustomerStore()
const $q = useQuasar()

const showGuarantees = ref(false)
const guarantees = ref([])
const guaranteesLoading = ref(false)
const recibos = ref([])
const recibosLoading = ref(false)
const selectedLoanId = ref(null)
const coverage = ref(null)

const customerId = computed(() => store.customer?.id)

// Garantias pertencem a UM crédito específico — selector próprio com todos os
// créditos com histórico (activos e terminados). Recibos são do mutuário.
// Ordem: PENDENTES primeiro (são os que precisam de garantias para poder ser
// aprovados), depois activos e terminados, os mais recentes à frente.
const LOAN_STATUS_PRIORITY = { 0: 0, 1: 1, 3: 2 }
const LOAN_STATUS_LABEL = { 0: 'Pendente', 1: 'Activo', 3: 'Terminado' }
const loanOptions = computed(() =>
  store.loans
    // 0=Pendente: garantias DEVEM ser registadas ANTES da aprovação —
    // a aprovação só passa com garantias registadas que cubram o total a
    // pagar (capital + juros).
    .filter(l => [0, 1, 3].includes(Number(l.status)))
    .slice()
    .sort((a, b) => {
      const pa = LOAN_STATUS_PRIORITY[Number(a.status)] ?? 9
      const pb = LOAN_STATUS_PRIORITY[Number(b.status)] ?? 9
      if (pa !== pb) return pa - pb
      return Number(b.id) - Number(a.id)
    })
    .map(l => ({
      label: `#${l.id} — ${formatMoney(l.amount)} (${LOAN_STATUS_LABEL[Number(l.status)] || l.status})`,
      value: l.id
    }))
)

/** Crédito a mostrar por defeito: o pendente mais recente (precisa de
 *  garantias para ser aprovado); senão o activo; senão o primeiro da lista. */
function pickDefaultLoan() {
  const first = loanOptions.value[0]
  if (first) {
    selectedLoanId.value = first.value
    return
  }
  selectedLoanId.value = store.activeLoan?.id ?? null
}

/**
 * A aba é montada antes de os créditos do mutuário chegarem (o detalhe do
 * mutuário carrega-os em paralelo) — sem este watch o selector ficava vazio
 * ("Sem crédito com garantias em contexto") e não havia como registar
 * garantias no crédito pendente.
 */
watch(
  () => store.loans,
  () => {
    const options = loanOptions.value
    if (!options.length) return
    const current = options.some(o => Number(o.value) === Number(selectedLoanId.value))
    if (current) return
    pickDefaultLoan()
  }
)

/** Ao fechar o modal, as garantias/cobertura mudaram: recarrega o cartão. */
function onGuaranteesModalToggle(open) {
  if (open) return
  fetchGuarantees()
  fetchCoverage()
}

async function fetchGuarantees() {
  if (!selectedLoanId.value) {
    guarantees.value = []
    return
  }
  guaranteesLoading.value = true
  try {
    const result = await loansStore.fetchGuarantees(selectedLoanId.value)
    guarantees.value = Array.isArray(result) ? result : []
  } catch {
    guarantees.value = []
  } finally {
    guaranteesLoading.value = false
  }
}

async function fetchCoverage() {
  if (!selectedLoanId.value) {
    coverage.value = null
    return
  }
  try {
    const { data } = await api.get(`/api/loan/${selectedLoanId.value}/guarantee-coverage`)
    coverage.value = data.success ? data.result : null
  } catch {
    coverage.value = null
  }
}

async function fetchRecibos() {
  if (!customerId.value || !store.customer?.companyId) {
    recibos.value = []
    return
  }
  recibosLoading.value = true
  try {
    const { data } = await api.get(`/api/recibos/customer/${customerId.value}`, {
      params: { companyId: store.customer.companyId }
    })
    if (data.success) recibos.value = Array.isArray(data.result) ? data.result : []
  } catch {
    recibos.value = []
  } finally {
    recibosLoading.value = false
  }
}

function guaranteePhotoUrl(g) {
  const url = g.guaranteePhotoUrl || g.photoUrl || g.documentFileUrl
  if (!url) return null
  return url.startsWith('http') || url.startsWith('/') ? url : `/documents/${url}`
}

function openPhoto(url) { window.open(url, '_blank') }
/**
 * Baixar Recibo: usa SEMPRE o endpoint do backend GET /api/recibos/:id/pdf —
 * é ele que respeita a feature flag da certificação AT (config/certificacao).
 * Com a flag desligada, o PDF sai limpo de 1 página, sem QR/hash/código AT.
 * (o campo pdf_url da listagem é caminho de ficheiro no servidor, não URL de API)
 *
 * O pedido passa pelo axios (blob) porque leva o token Bearer de sessão —
 * um window.open direto para a API iria sem cabeçalho e falhava com 401.
 */
async function openReciboPdf(r) {
  if (!r?.id) return
  try {
    const response = await api.get(`/api/recibos/${r.id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `Recibo-${r.numero || r.id}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 30000)
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível descarregar o recibo', position: 'top' })
  }
}
function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : '—' }

watch(selectedLoanId, () => {
  fetchGuarantees()
  fetchCoverage()
})

onMounted(() => {
  pickDefaultLoan()
  fetchGuarantees()
  fetchCoverage()
  fetchRecibos()
})

defineExpose({ fetchGuarantees, fetchCoverage, fetchRecibos })
</script>
