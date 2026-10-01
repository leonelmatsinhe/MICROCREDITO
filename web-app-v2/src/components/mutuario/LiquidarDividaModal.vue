<template>
  <q-dialog v-model="show" persistent transition-show="scale" transition-hide="fade">
    <q-card class="ld-card">
      <!-- ── HEADER ESCURO ── -->
      <q-card-section class="ld-header row items-center q-py-md q-px-lg">
        <q-avatar size="36px" class="ld-header-avatar">
          <q-icon name="paid" size="20px" />
        </q-avatar>
        <div class="q-ml-sm col">
          <div class="text-subtitle1 text-weight-bold text-white" style="line-height: 1.2">Liquidar Dívida Total</div>
          <div class="text-caption ld-header-sub">{{ customerName }} · {{ store.pendingInstallments.length }} prestação(ões) pendente(s)</div>
        </div>
        <q-badge class="ld-badge q-mr-sm" :label="`${formatMoney(totalComDesconto)} (Activa)`" />
        <q-btn flat round dense icon="close" class="text-white" @click="close" />
      </q-card-section>

      <q-card-section class="q-px-lg q-py-md scroll" style="max-height: 68vh">
        <!-- ── SECÇÃO 1: RESUMO POR PRESTAÇÃO ── -->
        <div class="ld-section-title">
          <q-icon name="fact_check" size="15px" class="q-mr-xs" /> Prestações a Liquidar
        </div>
        <q-markup-table flat dense bordered separator="cell" class="ld-table q-mb-sm">
          <thead>
            <tr class="ld-table-head">
              <th class="text-left">Prestação</th>
              <th class="text-right">Saldo</th>
              <th class="text-right">Mora</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in store.pendingInstallments" :key="row.id">
              <td class="text-weight-medium">{{ row.installmentOrder }}ª <span class="text-grey-5 text-caption">({{ formatDateShort(row.dueDate) }})</span></td>
              <td class="text-right">{{ formatMoney(installmentRemaining(row)) }}</td>
              <td class="text-right" :class="installmentLateInterest(row) > 0 ? 'text-negative text-weight-bold' : 'text-grey-6'">
                {{ formatMoney(installmentLateInterest(row)) }}
              </td>
              <td class="text-right text-weight-bold">{{ formatMoney(installmentTotalDue(row)) }}</td>
            </tr>
            <tr class="ld-table-footer">
              <td class="text-weight-bold">Total</td>
              <td></td>
              <td></td>
              <td class="text-right text-weight-bold text-positive" style="font-size: 14px">{{ formatMoney(totalPendente) }}</td>
            </tr>
          </tbody>
        </q-markup-table>

        <!-- ── SECÇÃO 2: DESCONTO ANTECIPADO ── -->
        <div class="ld-section-title">
          <q-icon name="sell" size="15px" class="q-mr-xs" /> Desconto
        </div>
        <q-toggle
          v-model="form.applyDiscount" label="Aplicar desconto por liquidação antecipada"
          color="primary" class="q-mb-xs" dense
        >
          <q-tooltip>Perdoa parte da dívida (juros futuros que o cliente deixa de pagar ao liquidar hoje). Exige justificativa.</q-tooltip>
        </q-toggle>
        <div class="row q-col-gutter-md" v-if="form.applyDiscount">
          <div class="col-12 col-sm-4">
            <q-select v-model="form.discountType" dense outlined :options="discountOptions" label="Tipo de desconto" emit-value map-options />
          </div>
          <div class="col-12 col-sm-4" v-if="form.discountType === 'percentage'">
            <q-input v-model.number="form.discountPercentage" dense outlined type="number" min="0" max="100" label="Valor desconto (%) *" :rules="[v => (v > 0 && v < 100) || 'Desconto inválido']" />
          </div>
          <div class="col-12 col-sm-4" v-if="form.discountType === 'fixed'">
            <q-input v-model.number="form.discountFixed" dense outlined type="number" min="0" :max="totalPendente" label="Valor desconto (MZN) *" :rules="[v => v > 0 || 'Desconto inválido']" />
          </div>
          <div class="col-12 col-sm-8">
            <q-input v-model="form.discountJustification" dense outlined label="Justificativa do desconto *"
              :rules="[v => !!String(v || '').trim() || 'Obrigatório com desconto activo']" />
          </div>
          <div class="col-12">
            <div class="text-caption text-grey-6">
              Total com desconto: <strong class="text-positive" style="font-size: 14px">{{ formatMoney(totalComDesconto) }}</strong>
              (poupança do cliente: <strong class="text-primary">{{ formatMoney(totalPendente - totalComDesconto) }}</strong>)
            </div>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- ── SECÇÃO 3: DADOS DA LIQUIDAÇÃO ── -->
        <div class="ld-section-title">
          <q-icon name="edit_note" size="15px" class="q-mr-xs" /> Dados da Liquidação
        </div>
        <q-form ref="formRef" greedy class="row q-col-gutter-md" @submit.prevent>
          <div class="col-12 col-sm-6">
            <q-input
              :model-value="formatDateShort(form.paymentDate)" dense outlined readonly label="Data de pagamento"
              :rules="[() => !!form.paymentDate || 'Obrigatório']"
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="form.paymentDate" mask="YYYY-MM-DD" :options="dateOptions" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.paymentMethod" dense outlined emit-value map-options
              label="Meio de pagamento *" placeholder="Seleccionar método"
              :options="paymentMethodOptions" :rules="[v => !!v || 'Obrigatório']"
            >
              <template v-slot:prepend><q-icon name="payments" size="18px" /></template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar><q-icon :name="scope.opt.icon" size="18px" /></q-item-section>
                  <q-item-section>{{ scope.opt.label }}</q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- CONTA DESTINO — OBRIGATÓRIA (corrige bug contábil: sem isto o dinheiro não tinha destino) -->
          <div class="col-12">
            <q-select
              v-model="selectedBankAccount" dense outlined use-input hide-selected fill-input
              input-debounce="0" :options="filteredAccounts"
              option-value="id" :option-label="accountOptionLabel"
              label="Conta Destino * (Reembolso/Misto/Caixa)"
              placeholder="Pesquisar conta…" :loading="bankStore.reembolsoLoading"
              :rules="[() => !!selectedBankAccount || 'Obrigatório — indique para onde vai o dinheiro liquidado']"
              @filter="onAccountFilter"
            >
              <template v-slot:prepend><q-icon name="account_balance" size="18px" /></template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.name }} — {{ formatMoney(scope.opt.balance) }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.bank_name }} · {{ scope.opt.purpose }} · {{ scope.opt.type }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <template v-slot:no-option>
                <q-item><q-item-section class="text-grey">Sem contas de destino — cadastre em Carteira Real</q-item-section></q-item>
              </template>
            </q-select>
          </div>

          <div class="col-12 col-sm-6">
            <q-input v-model="form.paymentReference" dense outlined label="Referência *" maxlength="40" :counter="40"
              placeholder="ID da transação / comprovativo" :rules="referenceRules">
              <template v-slot:prepend><q-icon name="tag" size="18px" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="form.phoneNumber" dense outlined label="Telefone do cliente" mask="############" hint="+258 — 12 dígitos" clearable>
              <template v-slot:prepend><q-icon name="phone" size="18px" /></template>
            </q-input>
          </div>
          <div class="col-12">
            <q-input
              v-model="form.observation" dense outlined type="textarea" autogrow rows="2"
              :label="form.applyDiscount ? 'Nota/Parecer (justificativa da liquidação) *' : 'Nota/Parecer'"
              placeholder="Motivo da liquidação total…"
              :rules="form.applyDiscount ? [v => !!String(v || '').trim() || 'Obrigatório quando há desconto'] : []"
            >
              <template v-slot:prepend><q-icon name="notes" size="18px" /></template>
            </q-input>
          </div>

          <div class="col-12">
            <q-banner class="ld-banner-info" rounded dense>
              <template v-slot:avatar><q-icon name="lock" color="blue-8" /></template>
              A liquidação é <strong>atómica</strong>: todas as prestações são registadas numa única transacção SQL. Se algo falhar, nada é gravado.
            </q-banner>
          </div>
        </q-form>
      </q-card-section>

      <!-- ── FOOTER ── -->
      <q-separator />
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="grey-7" no-caps @click="close" />
        <q-btn
          unelevated label="Confirmar Liquidação" icon="check_circle" no-caps
          color="positive" class="ld-confirm-btn"
          :loading="store.liquidating"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useAuthStore } from '@/stores/auth'
import { useBankStore } from '@/stores/bank'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loan: { type: Object, default: null },
  customer: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'pagamento-realizado'])

const $q = useQuasar()
const store = useMutuarioStore()
const authStore = useAuthStore()
const bankStore = useBankStore()

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const formRef = ref(null)
const todayDate = new Date().toISOString().slice(0, 10)
const customerName = computed(() => props.customer?.customerName || '')

const form = ref(defaultForm())
function defaultForm() {
  return {
    applyDiscount: false,
    discountType: 'percentage',
    discountPercentage: 0,
    discountFixed: 0,
    discountJustification: '',
    paymentDate: todayDate,
    paymentMethod: null,
    paymentReference: '',
    phoneNumber: String(props.customer?.customerPhone || ''),
    observation: ''
  }
}

const paymentMethodOptions = [
  { label: 'M-Pesa', value: 7, icon: 'smartphone' },
  { label: 'E-Mola', value: 6, icon: 'smartphone' },
  { label: 'Transferência Bancária', value: 3, icon: 'account_balance' },
  { label: 'Numerário', value: 1, icon: 'payments' },
  { label: 'Cheque', value: 2, icon: 'receipt_long' }
]
const discountOptions = [
  { label: 'Percentual (%)', value: 'percentage' },
  { label: 'Valor Fixo (MZN)', value: 'fixed' }
]

// ── HELPERS DAS PRESTAÇÕES ──
const installmentRemaining = (inst) => Math.max(0, Number(inst?.installment || 0) - Number(inst?.paidAmount || 0))
const installmentLateInterest = (inst) => Number(inst?.latePaymentInterest || 0)
const installmentTotalDue = (inst) => Math.round((installmentRemaining(inst) + installmentLateInterest(inst)) * 100) / 100

const totalPendente = computed(() =>
  store.pendingInstallments.reduce((sum, inst) => sum + installmentTotalDue(inst), 0)
)
const totalComDesconto = computed(() => {
  const total = totalPendente.value
  if (!form.value.applyDiscount) return total
  if (form.value.discountType === 'percentage') {
    return Math.round(total * (1 - (Number(form.value.discountPercentage) || 0) / 100) * 100) / 100
  }
  return Math.max(0, Math.round((total - (Number(form.value.discountFixed) || 0)) * 100) / 100)
})

// ── CONTA DESTINO (OBRIGATÓRIA) ──
const selectedBankAccount = ref(null)
const accountFilterQuery = ref('')
const filteredAccounts = computed(() => {
  const list = bankStore.byMethod(form.value.paymentMethod)
  const q = accountFilterQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(a => `${a.name} ${a.bank_name} ${a.purpose} ${a.type}`.toLowerCase().includes(q))
})
const onAccountFilter = (val, update) => {
  update(() => { accountFilterQuery.value = val })
}
// Colapsado mostra nome + saldo actual (ex.: "Colecta M-Pesa (portal) — 0,00 MZN")
const accountOptionLabel = (a) => `${a.name} — ${formatMoney(a.balance)}`
const fetchAccounts = async () => {
  try {
    await bankStore.fetchReembolsoAccounts(props.customer?.companyId, form.value.paymentMethod)
    const valid = bankStore.byMethod(form.value.paymentMethod)
      .some(a => Number(a.id) === Number(selectedBankAccount.value?.id))
    if (!valid && bankStore.reembolsoAccounts.length > 0) {
      selectedBankAccount.value = bankStore.byMethod(form.value.paymentMethod)[0]
    }
  } catch { /* falha de rede → usuário escolhe manualmente */ }
}
watch(() => form.value.paymentMethod, () => {
  const first = bankStore.byMethod(form.value.paymentMethod)[0]
  if (first) selectedBankAccount.value = first
})

const dateOptions = (date) => date <= todayDate
const checkReferenceDuplicate = async () => false // liquidação usa 1 referência para N transacções

const referenceRules = computed(() => [
  v => !!String(v || '').trim() || 'Obrigatório',
  async v => !String(v || '').trim() || !(await checkReferenceDuplicate(v)) || 'Esta referência já existe'
])

// ── ABERTURA / FECHO ──
watch(show, (v) => {
  if (v) {
    form.value = defaultForm()
    selectedBankAccount.value = null
    fetchAccounts()
  }
})
const close = () => { emit('update:modelValue', false) }

// ── SUBMISSÃO (POST /api/tranzaction/bulk — transacção SQL atómica) ──
const submit = async () => {
  if (!props.loan) return
  if (formRef.value) {
    const valid = await formRef.value.validate()
    if (!valid) return
  }
  if (!selectedBankAccount.value) {
    $q.notify({ type: 'negative', message: 'Seleccione a conta de destino da liquidação', position: 'top' })
    return
  }
  // Numerário sem referência → auto-gerada (backend exige referência)
  if (Number(form.value.paymentMethod) === 1 && !String(form.value.paymentReference || '').trim()) {
    form.value.paymentReference = `NUM-${props.customer?.accountNumber || 'X'}-${Date.now().toString().slice(-8)}`
  }
  // Nota/Parecer + justificativa do desconto (quando activo) — ambos
  // preservados no campo notes da liquidação (auditável no recibo).
  const notesParts = []
  if (String(form.value.observation || '').trim()) notesParts.push(String(form.value.observation).trim())
  if (form.value.applyDiscount && String(form.value.discountJustification || '').trim()) {
    const rotulo = form.value.discountType === 'percentage'
      ? `${Number(form.value.discountPercentage) || 0}%`
      : formatMoney(form.value.discountFixed)
    notesParts.push(`[Desconto ${rotulo}] ${String(form.value.discountJustification).trim()}`)
  }

  try {
    const data = await store.liquidateAll({
      loanId: props.loan.id,
      paymentMethod: form.value.paymentMethod,
      tranzactionReference: form.value.paymentReference,
      phoneNumber: form.value.phoneNumber || props.customer?.customerPhone || '',
      staffName: authStore.userName || '',
      paymentDate: form.value.paymentDate,
      notes: notesParts.length > 0 ? notesParts.join(' — ') : null,
      bank_account_id: selectedBankAccount.value.id,
      discountApplied: form.value.applyDiscount,
      discountType: form.value.discountType,
      discountPercentage: Number(form.value.discountPercentage) || 0,
      discountFixed: Number(form.value.discountFixed) || 0
    })
    const destino = data?.result?.destination || selectedBankAccount.value.name
    $q.notify({
      type: 'positive',
      message: `Liquidação atómica concluída: ${data.result?.installmentsCleared || 0} prestação(ões), ${formatMoney(data.result?.totalPaid || 0)} pagos → ${destino}`,
      position: 'top',
      timeout: 5000
    })
    close()
    emit('pagamento-realizado', data)
  } catch (e) {
    // Erro atómico: nada foi gravado, pode tentar de novo
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || e.message || 'Falha na liquidação — nada foi gravado',
      position: 'top',
      timeout: 6000
    })
  }
}
</script>

<style lang="scss" scoped>
.ld-card {
  width: 750px;
  max-width: 95vw;
  border-radius: 16px;
  overflow: hidden;
}
.ld-header {
  background: #1a3c2a;
  background: linear-gradient(135deg, #1a3c2a 0%, #245740 100%);
}
.ld-header-avatar {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.ld-header-sub {
  color: rgba(255, 255, 255, 0.72);
}
.ld-badge {
  background: #2e7d32;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 8px;
}
.ld-section-title {
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $primary;
  margin-bottom: 8px;
}
.ld-table {
  border-radius: 10px;
}
.ld-table-head th {
  background: #f0f5f1;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $grey-7;
}
.ld-table-footer td {
  background: #ecfdf5;
  border-top: 2px solid #a7f3d0;
}
.ld-banner-info {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}
.ld-confirm-btn {
  background: #2e7d32;
}
</style>
