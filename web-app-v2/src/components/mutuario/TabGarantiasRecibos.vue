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
              <div class="text-caption q-mt-sm">Sem crédito com garantias em contexto.</div>
            </div>

            <template v-else>
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
                      <div class="text-caption text-grey-5">
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
                    <div class="text-caption text-grey-5">
                      {{ formatMoney(r.totalAmount || r.amount) }} · {{ formatDate(r.createdAt) }}
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
    <GuaranteesModal v-model="showGuarantees" :loan-id="selectedLoanId" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMutuarioStore } from '@/stores/mutuario'
import { useLoansStore } from '@/stores/loans'
import { useCustomerStore } from '@/stores/customers'
import { api } from '@/boot/axios'
import { formatMoney } from '@/utils/formatters'
import GuaranteesModal from '@/components/modals/GuaranteesModal.vue'

const store = useMutuarioStore()
const loansStore = useLoansStore()
const customerStore = useCustomerStore()

const showGuarantees = ref(false)
const guarantees = ref([])
const guaranteesLoading = ref(false)
const recibos = ref([])
const recibosLoading = ref(false)
const selectedLoanId = ref(null)

const customerId = computed(() => store.customer?.id)

// Garantias pertencem a UM crédito específico — selector próprio com todos os
// créditos com histórico (activos e terminados). Recibos são do mutuário.
const loanOptions = computed(() =>
  store.loans
    .filter(l => [1, 3].includes(Number(l.status)))
    .map(l => ({ label: `#${l.id} — ${formatMoney(l.amount)} (${Number(l.status) === 1 ? 'Activo' : 'Terminado'})`, value: l.id }))
)

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
function openReciboPdf(r) {
  if (r.pdf_url) window.open(r.pdf_url, '_blank')
  else window.open(`/api/recibos/${r.id}/pdf`, '_blank')
}
function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : '—' }

watch(selectedLoanId, () => fetchGuarantees())

onMounted(() => {
  // Pré-selecciona o crédito activo mais recente, se existir
  if (store.activeLoan?.id) selectedLoanId.value = store.activeLoan.id
  fetchGuarantees()
  fetchRecibos()
})

defineExpose({ fetchGuarantees, fetchRecibos })
</script>
