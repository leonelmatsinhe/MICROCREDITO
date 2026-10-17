<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Modo de Caixa</div>
        <div class="text-caption text-grey-5">
          Escolha como a empresa gere o dia: contagem de dinheiro físico ou reconciliação bancária manual.
        </div>
      </div>
      <div class="col-auto">
        <q-btn
          v-if="canEdit"
          color="primary"
          unelevated
          no-caps
          rounded
          size="sm"
          icon="save"
          label="Guardar"
          :loading="saving"
          :disable="!dirty"
          @click="save"
        />
      </div>
    </div>

    <q-card flat class="glass-tile q-pa-md q-mb-md">
      <div class="text-caption text-grey-6 q-mb-sm">Modo activo</div>

      <q-btn-toggle
        v-model="mode"
        no-caps
        rounded
        unelevated
        toggle-color="primary"
        color="grey-3"
        text-color="grey-8"
        :options="modeOptions"
        :disable="!canEdit || saving"
        class="mode-toggle"
      />

      <div class="text-caption q-mt-md" :class="mode === 'ELECTRONIC' ? 'text-primary' : 'text-grey-7'">
        <q-icon :name="mode === 'ELECTRONIC' ? 'account_balance' : 'point_of_sale'" size="15px" class="q-mr-xs" />
        <template v-if="mode === 'ELECTRONIC'">
          <strong>Eletrónico manual</strong> — o dia abre com o saldo da conta bancária e fecha
          comparando o saldo real que vê no banco com o saldo teórico do sistema.
          Desembolsos e pagamentos <strong>não exigem caixa aberto</strong>.
        </template>
        <template v-else>
          <strong>Físico</strong> — o dia exige caixa aberto, folha de contagem de numerário
          e conferência cega no fecho (fluxo anterior).
        </template>
      </div>
    </q-card>

    <q-card v-if="mode === 'ELECTRONIC'" flat class="glass-tile">
      <q-card-section class="row items-center q-py-sm">
        <div class="col">
          <div class="text-subtitle2 text-weight-bold">Contas bancárias disponíveis</div>
          <div class="text-caption text-grey-6">
            As mesmas contas já cadastradas no sistema — escolha uma delas no Caixa do dia.
          </div>
        </div>
        <q-btn flat dense no-caps color="primary" icon="refresh" label="Actualizar" :loading="loadingAccounts" @click="loadAccounts" />
      </q-card-section>
      <q-separator />

      <div v-if="loadingAccounts" class="text-center q-pa-lg">
        <q-spinner-dots size="30px" color="primary" />
      </div>
      <div v-else-if="accounts.length === 0" class="text-center q-pa-lg">
        <q-icon name="account_balance" size="40px" color="grey-4" />
        <div class="text-caption text-grey-6 q-mt-sm">
          Ainda não há contas bancárias. Registe-as em Configurações → Contas Bancárias.
        </div>
      </div>
      <q-list v-else separator>
        <q-item v-for="account in accounts" :key="account.id">
          <q-item-section avatar>
            <q-avatar size="34px" color="grey-2" text-color="grey-8" icon="account_balance" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium" style="font-size: 13px">
              {{ account.bank_name || account.accountDescription || 'Conta' }}
              <q-badge
                v-if="!Number(account.is_active)"
                color="grey-6"
                label="Inactiva"
                class="q-ml-xs"
                style="font-size: 9px"
              />
            </q-item-label>
            <q-item-label caption style="font-size: 11px">
              {{ account.accountNumber || 'Sem número' }}
              <template v-if="account.accountHolder"> · {{ account.accountHolder }}</template>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="text-right">
              <div class="text-weight-bold" style="font-size: 13px; font-variant-numeric: tabular-nums">
                {{ formatMoney(account.balance) }}
              </div>
              <div class="text-caption text-grey-5" style="font-size: 10px">saldo actual</div>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <div v-if="!canEdit" class="text-caption text-grey-6 q-mt-md">
      <q-icon name="lock" size="14px" class="q-mr-xs" />
      Apenas o Administrador pode alterar o modo de caixa.
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'

/**
 * MODO DE CAIXA (Configurações)
 * PHYSICAL   → caixa de numerário (contagem + conferência cega).
 * ELECTRONIC → reconciliação manual por conta bancária JÁ EXISTENTE no sistema
 *              (`accounts`). Não cria contas novas: apenas as lista.
 */
const $q = useQuasar()
const authStore = useAuthStore()

const canEdit = computed(() => [0, 1].includes(Number(authStore.user?.userRole)))
const mode = ref('ELECTRONIC')
const savedMode = ref('ELECTRONIC')
const saving = ref(false)
const loadingAccounts = ref(false)
const accounts = ref([])

const modeOptions = [
  { label: 'Físico', value: 'PHYSICAL', icon: 'point_of_sale' },
  { label: 'Eletrónico Manual', value: 'ELECTRONIC', icon: 'account_balance' }
]

const dirty = computed(() => mode.value !== savedMode.value)

const formatMoney = (value) =>
  (Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MZN'

async function loadMode() {
  try {
    const { data } = await api.get('/api/cash-register/mode')
    if (data.success) {
      mode.value = data.result.mode === 'PHYSICAL' ? 'PHYSICAL' : 'ELECTRONIC'
      savedMode.value = mode.value
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar o modo de caixa', position: 'top' })
  }
}

async function loadAccounts() {
  loadingAccounts.value = true
  try {
    const { data } = await api.get('/api/bank-accounts')
    if (data.success) accounts.value = data.result || []
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao listar contas bancárias', position: 'top' })
  } finally {
    loadingAccounts.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const { data } = await api.put('/api/cash-register/mode', { mode: mode.value })
    if (data.success) {
      savedMode.value = data.result.mode
      $q.notify({ type: 'positive', message: 'Modo de caixa actualizado.', position: 'top' })
    }
  } catch (error) {
    mode.value = savedMode.value
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao guardar o modo de caixa', position: 'top' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadMode()
  if (mode.value === 'ELECTRONIC') loadAccounts()
})
</script>

<style lang="scss" scoped>
.glass-tile {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(15, 23, 42, 0.06);
}
body.body--dark .glass-tile {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.mode-toggle :deep(.q-btn) {
  padding: 6px 18px;
  font-size: 12px;
}
</style>
