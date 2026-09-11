<template>
  <q-card
    flat
    bordered
    class="sms-balance-widget q-mb-md"
    style="border-radius: 12px"
    :class="bannerClass"
  >
    <q-card-section class="row items-center no-wrap q-py-sm">
      <q-avatar :color="avatarColor" text-color="white" size="36px">
        <q-icon :name="avatarIcon" size="20px" />
      </q-avatar>

      <div class="col q-ml-sm">
        <!-- Chave não configurada -->
        <template v-if="!wallet.configured">
          <div class="text-subtitle2 text-weight-bold">Serviço SMS não configurado</div>
          <div class="text-caption text-grey-6">
            As credenciais de integração do serviço de SMS (BULKSMS_API_KEY e BULKSMS_SENDER_ID) não estão configuradas.
            O envio de SMS encontra-se indisponível até o Administrador configurar as credenciais no ficheiro <strong>.env</strong> do servidor.
          </div>
        </template>

        <!-- Erro ao consultar saldo -->
        <template v-else-if="wallet.error">
          <div class="text-subtitle2 text-weight-bold">Saldo BulkSMM indisponível</div>
          <div class="text-caption text-grey-6 ellipsis-2-lines" :title="wallet.error">
            {{ wallet.error }}
          </div>
        </template>

        <!-- Saldo consultado -->
        <template v-else>
          <div class="row items-baseline no-wrap">
            <span class="text-subtitle2 text-weight-bold q-mr-xs">Saldo BulkSMM:</span>
            <span class="text-weight-bold" :class="balanceTextClass">{{ balanceLabel }}</span>
          </div>
          <q-linear-progress
            v-if="balancePercent !== null"
            :value="balancePercent"
            :color="progressColor"
            track-color="grey-3"
            size="6px"
            rounded
            class="q-mt-xs"
            style="max-width: 220px"
          />
          <div v-if="wallet.lowBalance" class="text-caption text-negative text-weight-medium q-mt-xs">
            <q-icon name="warning_amber" size="14px" class="q-mr-xs" />
            Unidades a acabar — compre mais unidades no BulkSMM para não interromper os envios.
          </div>
        </template>
      </div>

      <q-btn
        flat
        round
        dense
        icon="refresh"
        color="grey-7"
        :loading="refreshing"
        @click="fetchBalance"
      >
        <q-tooltip>Actualizar saldo</q-tooltip>
      </q-btn>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'

const authStore = useAuthStore()

const wallet = ref({
  configured: false,
  balance: null,
  currency: null,
  lowBalance: false,
  error: null
})
const refreshing = ref(false)
let timer = null

const balanceLabel = computed(() => {
  const b = wallet.value.balance
  if (b === null || b === undefined) return '—'
  const formatted = Number(b).toLocaleString('pt-MZ', { maximumFractionDigits: 2 })
  return wallet.value.currency ? `${formatted} ${wallet.value.currency}` : formatted
})

// Barra de progresso: assume 500 unidades como "cheio" (cap em 100%)
const balancePercent = computed(() => {
  const b = wallet.value.balance
  if (b === null || b === undefined) return null
  return Math.min(1, Math.max(0, Number(b) / 500))
})

const avatarColor = computed(() => {
  if (!wallet.value.configured) return 'grey-6'
  if (wallet.value.error) return 'grey-7'
  if (wallet.value.lowBalance) return 'negative'
  return 'teal'
})

const avatarIcon = computed(() => {
  if (!wallet.value.configured) return 'key_off'
  if (wallet.value.error) return 'cloud_off'
  if (wallet.value.lowBalance) return 'warning_amber'
  return 'account_balance_wallet'
})

const bannerClass = computed(() => {
  if (wallet.value.configured && !wallet.value.error && wallet.value.lowBalance) {
    return 'bg-red-1'
  }
  return ''
})

const balanceTextClass = computed(() => {
  if (wallet.value.lowBalance) return 'text-negative'
  return 'text-teal'
})

const progressColor = computed(() => (wallet.value.lowBalance ? 'negative' : 'teal'))

async function fetchBalance() {
  refreshing.value = true
  try {
    const companyId = authStore.companyId
    if (!companyId) return
    const { data } = await api.get('/api/sms-gateway/summary', { params: { companyId } })
    if (data?.success && data.result?.wallet) {
      wallet.value = data.result.wallet
    }
  } catch (e) {
    // silencioso — mantém o último estado conhecido
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  fetchBalance()
  // Refresca a cada 5 minutos
  timer = setInterval(fetchBalance, 5 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
