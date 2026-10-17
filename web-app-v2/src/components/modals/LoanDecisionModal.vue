<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 500px; max-width: 640px; border-radius: 16px">
      <q-card-section class="bg-primary text-white row items-center" style="border-radius: 16px 16px 0 0">
        <div>
          <div class="text-h6">Aprovação de Crédito</div>
          <div class="text-caption">Decisão com alçada — aprovar não mexe no caixa</div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" :disable="submitting" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Resumo do pedido -->
        <q-card flat bordered class="q-pa-sm q-mb-md">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-5">Montante solicitado</div>
              <div class="text-weight-bold text-primary" style="font-size: 15px">
                {{ formatMoney(loan?.amount) }} MZN
              </div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Prestações</div>
              <div class="text-weight-bold" style="font-size: 15px">{{ loan?.numberOfInstallments }}</div>
            </div>
            <div class="col-12" v-if="loan?.loanDescription">
              <div class="text-caption text-grey-5">Finalidade</div>
              <div class="text-body2">{{ loan.loanDescription }}</div>
            </div>
          </div>
        </q-card>

        <!-- ALÇADA: insuficiente → mensagem clara antes/depois da tentativa -->
        <q-banner v-if="!authority.allowed" dense rounded class="bg-red-1 text-negative q-mb-md">
          <template v-slot:avatar><q-icon name="gpp_bad" color="negative" /></template>
          <div class="text-body2 text-weight-medium">
            {{ authority.message || 'Alçada insuficiente para aprovar este crédito.' }}
          </div>
        </q-banner>

        <!-- ALÇADA: suficiente → o que esta aprovação decide -->
        <q-banner v-else dense rounded class="bg-green-1 text-positive q-mb-md">
          <template v-slot:avatar><q-icon name="verified_user" color="positive" /></template>
          <div class="text-body2">
            <template v-if="authority.isCommittee">
              <strong>Comitê de Crédito:</strong> acima de 100.000 MT o crédito exige
              <strong>{{ authority.requiredApprovals }} aprovações de Admins diferentes</strong>.
              Registadas: <strong>{{ approvalsRegistered }} de {{ authority.requiredApprovals }}</strong>.
            </template>
            <template v-else>
              Dentro da sua alçada ({{ authority.userRoleLabel }}) — esta aprovação conclui a decisão.
            </template>
          </div>
        </q-banner>

        <!-- Parecer -->
        <q-input
          v-model="notes"
          type="textarea"
          outlined
          dense
          autogrow
          label="Parecer / observação (opcional)"
          hint="Obrigatório (mín. 10 caracteres) se a prestação exceder 1/3 do rendimento do mutuário."
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancelar" color="grey" no-caps :disable="submitting" v-close-popup />
        <q-btn
          unelevated
          :label="approveLabel"
          color="positive"
          icon="how_to_vote"
          no-caps
          rounded
          :loading="submitting"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loan: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'approved'])

const $q = useQuasar()
const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const submitting = ref(false)
const notes = ref('')
const authority = ref({
  allowed: true,
  requiredApprovals: 1,
  isCommittee: false,
  userRoleLabel: '',
  message: null
})
const approvalsRegistered = ref(0)

const approveLabel = computed(() => {
  if (authority.value.isCommittee) {
    return `Aprovar (${approvalsRegistered.value + 1} de ${authority.value.requiredApprovals})`
  }
  return 'Aprovar'
})

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Alçada do utilizador actual para o valor do crédito (tabela de regras).
async function fetchAuthority() {
  try {
    const { data } = await api.get(`/api/loan/approval-rules?amount=${Number(props.loan?.amount) || 0}`)
    if (data?.success && data.result) {
      authority.value = {
        allowed: !!data.result.allowed,
        requiredApprovals: Number(data.result.requiredApprovals) || 1,
        isCommittee: !!data.result.isCommittee,
        userRoleLabel: data.result.userRoleLabel || '',
        message: data.result.message || null
      }
    }
  } catch (e) {
    console.error('Erro ao carregar alçadas:', e)
  }
}

// Aprovações válidas já registadas (ignora as anteriores a reprovação/reabertura).
async function fetchApprovals() {
  try {
    const { data } = await api.get(`/api/loan/${props.loan?.id}/approval-timeline`)
    const events = Array.isArray(data?.result) ? data.result : []
    let lastInvalidation = -1
    events.forEach((event, index) => {
      if (event.event === 'REPROVACAO' || event.event === 'REABERTURA') lastInvalidation = index
    })
    approvalsRegistered.value = events.filter(
      (event, index) => event.event === 'APROVACAO' && index > lastInvalidation
    ).length
  } catch (e) {
    approvalsRegistered.value = 0
  }
}

watch(show, (val) => {
  if (val) {
    notes.value = ''
    approvalsRegistered.value = 0
    fetchAuthority()
    fetchApprovals()
  }
})

async function confirm() {
  if (!props.loan?.id) return
  submitting.value = true
  try {
    const { data } = await api.post(`/api/loan/${props.loan.id}/approve`, {
      notes: notes.value && notes.value.trim() ? notes.value.trim() : null
    })
    $q.notify({
      type: 'positive',
      message: data?.message || 'Crédito aprovado.',
      position: 'top'
    })
    show.value = false
    emit('approved', { loan: props.loan, result: data })
  } catch (error) {
    // 403 INSUFFICIENT_AUTHORITY → a mensagem de alçada insuficiente do servidor
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao registar a aprovação',
      position: 'top'
    })
    fetchAuthority()
    fetchApprovals()
  } finally {
    submitting.value = false
  }
}
</script>
