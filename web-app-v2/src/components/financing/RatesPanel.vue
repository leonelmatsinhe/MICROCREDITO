<template>
  <div>
    <!-- ═══════ CABEÇALHO ═══════ -->
    <div class="row items-center q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md">
        <div class="row items-center no-wrap">
          <div class="panel-icon q-mr-sm"><q-icon name="percent" size="20px" color="white" /></div>
          <div>
            <div class="text-subtitle1 text-weight-bold">Taxas de Juro por Origem de Capital</div>
            <div class="text-caption text-grey-6">
              Cada taxa pertence a uma <strong>carteira de financiamento</strong> (dinheiro analítico) ou a uma
              <strong>conta de desembolso</strong> (dinheiro real). O crédito herda esta origem.
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-auto q-gutter-xs no-wrap">
        <q-btn color="primary" unelevated no-caps rounded icon="add" label="Nova Taxa" @click="openCreate" />
        <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="load">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══════ RESUMO ═══════ -->
    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="tile in tiles" :key="tile.label" class="col-6 col-md-3">
        <q-card flat class="glass-tile q-pa-md">
          <div class="row items-center no-wrap">
            <div class="tile-icon q-mr-sm" :style="{ background: tile.bg }">
              <q-icon :name="tile.icon" size="18px" :color="tile.color" />
            </div>
            <div>
              <div class="text-caption text-grey-6">{{ tile.label }}</div>
              <div class="text-subtitle1 text-weight-bold">{{ tile.value }}</div>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <q-banner v-if="semVinculacaoCount > 0" dense rounded class="bg-orange-1 text-orange-10 q-mb-md">
      <template v-slot:avatar><q-icon name="link_off" /></template>
      {{ semVinculacaoCount }} taxa(s) ainda sem origem de capital. Use <strong>Vincular</strong> para as ligar a uma
      carteira ou a uma conta de desembolso.
    </q-banner>

    <!-- ═══════ CARREGAMENTO / VAZIO ═══════ -->
    <div v-if="loading && rates.length === 0" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>
    <q-card v-else-if="rates.length === 0" flat class="glass-tile text-center q-pa-xl">
      <q-icon name="percent" size="52px" color="grey-4" />
      <div class="text-subtitle1 text-grey-6 q-mt-sm">Nenhuma taxa de juro registada</div>
      <q-btn color="primary" rounded unelevated no-caps label="Criar primeira taxa" class="q-mt-md" @click="openCreate" />
    </q-card>

    <!-- ═══════ GRELHA DE TAXAS ═══════ -->
    <div v-else class="row q-col-gutter-md">
      <div v-for="rate in rates" :key="rate.id" class="col-12 col-sm-6 col-lg-4">
        <q-card flat class="rate-card">
          <q-card-section class="q-pb-sm">
            <div class="row items-center no-wrap">
              <div class="rate-icon"><q-icon name="percent" size="22px" color="primary" /></div>
              <div class="col q-ml-sm">
                <div class="text-h6 text-weight-bold text-primary" style="line-height: 1.1">
                  {{ (Number(rate.tax) * 100).toFixed(1) }}%
                </div>
                <div class="text-caption text-grey-6 ellipsis">{{ rate.name || 'Taxa de juro' }}</div>
              </div>
              <q-btn flat round dense size="sm" icon="more_vert">
                <q-menu anchor="bottom right" self="top right">
                  <q-list style="min-width: 190px">
                    <q-item clickable v-close-popup @click="openEdit(rate)">
                      <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar / revincular</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openEdit(rate)">
                      <q-item-section avatar><q-icon name="link" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Alterar origem do capital</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="confirmDelete(rate)">
                      <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                      <q-item-section class="text-negative" style="font-size: 13px">Eliminar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <!-- Origem do capital -->
            <div v-if="rate.vinculacao === 'CARTEIRA' && rate.carteira" class="vinculo vinculo-carteira">
              <q-badge :color="rate.carteira.cor_badge || 'blue'" :label="rate.carteira.codigo" />
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="text-caption text-weight-bold ellipsis">{{ rate.carteira.nome }}</div>
                <div class="text-caption text-grey-6">
                  {{ rate.carteira.parceiro_nome ? `Parceiro ${rate.carteira.parceiro_nome} · ` : '' }}
                  {{ rate.carteira.allocated_amount === null ? 'Sem limite' : money(rate.carteira.allocated_amount) }}
                </div>
              </div>
            </div>

            <div v-else-if="rate.vinculacao === 'CONTA' && rate.conta" class="vinculo vinculo-conta">
              <q-icon name="account_balance" size="18px" color="indigo-7" />
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="text-caption text-weight-bold ellipsis">{{ rate.conta.bank_name || 'Conta' }}</div>
                <div class="text-caption text-grey-6">
                  {{ rate.conta.purpose }} · {{ money(rate.conta.balance) }}
                </div>
              </div>
            </div>

            <div v-else class="vinculo vinculo-none">
              <q-icon name="link_off" size="18px" color="grey-6" />
              <div class="col q-ml-sm">
                <div class="text-caption text-weight-bold">Sem vinculação</div>
                <div class="text-caption text-grey-6">Taxa genérica — escolha a origem do capital</div>
              </div>
              <q-btn flat dense no-caps size="sm" color="primary" label="Vincular" @click="openEdit(rate)" />
            </div>

            <div class="text-caption text-grey-6 q-mt-sm" v-if="Number(rate.administrativeFee) > 0">
              <q-icon name="receipt" size="12px" class="q-mr-xs" />
              Taxa administrativa: {{ (Number(rate.administrativeFee) * 100).toFixed(1) }}%
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════ DIALOG: CRIAR / EDITAR (com origem do capital) ═══════ -->
    <q-dialog v-model="showForm" persistent>
      <q-card class="dialog-md">
        <q-card-section class="row items-center dialog-head">
          <q-icon :name="editingRate ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ editingRate ? 'Editar Taxa' : 'Nova Taxa de Juro' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeForm" />
        </q-card-section>

        <q-card-section class="q-gutter-y-md scroll" style="max-height: 68vh">
          <q-input v-model="form.name" dense outlined label="Nome / Descrição *" :rules="[(v) => !!v || 'Obrigatório']" input-style="font-size: 13px">
            <template v-slot:prepend><q-icon name="label" size="16px" color="grey-5" /></template>
          </q-input>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="form.taxPercent" dense outlined label="Taxa de Juro (%) *" type="number" step="0.1" :rules="[(v) => !!v || 'Obrigatório']" input-style="font-size: 13px">
                <template v-slot:prepend><q-icon name="percent" size="16px" color="grey-5" /></template>
              </q-input>
            </div>
            <div class="col-6">
              <q-input v-model.number="form.adminFeePercent" dense outlined label="Taxa Administrativa (%)" type="number" step="0.1" input-style="font-size: 13px">
                <template v-slot:prepend><q-icon name="receipt" size="16px" color="grey-5" /></template>
              </q-input>
            </div>
          </div>

          <q-separator />
          <div class="text-subtitle2">Vincular a *</div>
          <q-option-group
            v-model="form.vinculacao"
            :options="vinculacaoOptions"
            color="primary"
            inline
            class="q-gutter-sm"
          />

          <!-- Carteira de financiamento -->
          <q-select
            v-if="form.vinculacao === 'CARTEIRA'"
            v-model="form.walletId"
            :options="walletOptions"
            dense outlined emit-value map-options
            label="Carteira de Financiamento *"
            hint="Dinheiro analítico (parceria/fundo). O crédito herda a carteira da taxa."
            :rules="[(v) => form.vinculacao !== 'CARTEIRA' || !!v || 'Selecione a carteira']"
          >
            <template v-slot:prepend><q-icon name="savings" size="16px" color="grey-5" /></template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-badge :color="scope.opt.cor || 'blue'" :label="scope.opt.codigo" />
                </q-item-section>
                <q-item-section>
                  <q-item-label style="font-size: 13px">{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>
                    {{ scope.opt.parceiro ? `Parceiro: ${scope.opt.parceiro}` : 'Fundo próprio MBRM' }}
                    <span v-if="scope.opt.inactiva" class="text-negative"> · inactiva</span>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Conta de desembolso (dinheiro real) -->
          <q-select
            v-if="form.vinculacao === 'CONTA'"
            v-model="form.accountId"
            :options="desembolsoAccountOptions"
            dense outlined emit-value map-options
            label="Conta de Desembolso Principal *"
            hint="Dinheiro real (accounts DESEMBOLSO/MISTO) — o que sai para o cliente."
            :rules="[(v) => form.vinculacao !== 'CONTA' || !!v || 'Selecione a conta']"
          >
            <template v-slot:prepend><q-icon name="account_balance" size="16px" color="grey-5" /></template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar><q-icon name="account_balance" color="indigo-7" /></q-item-section>
                <q-item-section>
                  <q-item-label style="font-size: 13px">{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.purpose }} · saldo {{ money(scope.opt.saldo) }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Sem vinculação (taxas legadas) -->
          <q-banner v-if="form.vinculacao === 'NENHUMA'" dense rounded class="bg-grey-2 text-grey-9">
            <template v-slot:avatar><q-icon name="info" /></template>
            Taxa genérica, sem origem de capital definida. Pode vinculá-la mais tarde sem perder histórico.
          </q-banner>

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancelar" color="grey" @click="closeForm" no-caps />
            <q-btn unelevated rounded :label="editingRate ? 'Salvar' : 'Criar taxa'" color="primary" :loading="saving" @click="saveRate" no-caps />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: ELIMINAR ═══════ -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card class="dialog-sm">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md">Eliminar Taxa</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            {{ editingToDelete?.name || 'Taxa de juro' }} — {{ ((Number(editingToDelete?.tax) || 0) * 100).toFixed(1) }}%
          </div>
          <div class="text-caption text-grey-5 q-mt-xs">Créditos já concedidos mantêm a taxa gravada no plano.</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup no-caps />
          <q-btn unelevated label="Eliminar" color="negative" :loading="saving" @click="deleteRateConfirmed" v-close-popup no-caps rounded />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useWalletsStore } from '@/stores/wallets'
import { logUpdateRates } from '@/utils/logger'

/**
 * TAXAS DE JURO — vinculação explícita à origem do capital:
 *   CARTEIRA (financing_wallets, dinheiro analítico) | CONTA (accounts
 *   DESEMBOLSO/MISTO, dinheiro real) | NENHUMA (taxa genérica legada).
 * O backend garante que nunca ficam as duas preenchidas ao mesmo tempo.
 */
const $q = useQuasar()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const walletsStore = useWalletsStore()

const loading = computed(() => settingsStore.loadingRates)
const saving = computed(() => settingsStore.saving)
const rates = computed(() => settingsStore.rates)
const walletOptions = computed(() => walletsStore.allWalletOptions.length ? walletsStore.allWalletOptions : walletsStore.walletOptions)

const desembolsoAccounts = computed(() =>
  (settingsStore.accounts || []).filter((account) => ['DESEMBOLSO', 'MISTO'].includes(String(account.purpose)))
)
const desembolsoAccountOptions = computed(() =>
  desembolsoAccounts.value.map((account) => ({
    label: `${account.bank_name || 'Conta'} · ${account.accountNumber}`,
    value: account.id,
    purpose: account.purpose,
    saldo: account.balance
  }))
)

const semVinculacaoCount = computed(() => rates.value.filter((rate) => !rate.walletId && !rate.accountId).length)

const tiles = computed(() => {
  const comCarteira = rates.value.filter((rate) => rate.vinculacao === 'CARTEIRA' || rate.walletId).length
  const comConta = rates.value.filter((rate) => rate.vinculacao === 'CONTA' || rate.accountId).length
  const medias = rates.value.map((rate) => Number(rate.tax) || 0).filter((value) => value > 0)
  const media = medias.length ? medias.reduce((sum, value) => sum + value, 0) / medias.length : 0
  return [
    { label: 'Taxas registadas', value: rates.value.length, icon: 'percent', color: 'primary', bg: 'rgba(37,99,235,0.12)' },
    { label: 'Via carteira de financiamento', value: comCarteira, icon: 'savings', color: 'green-7', bg: 'rgba(5,150,105,0.12)' },
    { label: 'Via conta de desembolso', value: comConta, icon: 'account_balance', color: 'indigo-7', bg: 'rgba(79,70,229,0.12)' },
    { label: 'Taxa média', value: `${(media * 100).toFixed(2)}%`, icon: 'insights', color: 'deep-purple', bg: 'rgba(124,58,237,0.12)' }
  ]
})

const showForm = ref(false)
const showDeleteConfirm = ref(false)
const editingRate = ref(null)
const editingToDelete = ref(null)
const form = ref({ name: '', taxPercent: '', adminFeePercent: 0, vinculacao: 'CARTEIRA', walletId: null, accountId: null })

const vinculacaoOptions = [
  { label: 'Carteira de Financiamento', value: 'CARTEIRA' },
  { label: 'Conta de Desembolso Principal', value: 'CONTA' },
  { label: 'Sem vinculação', value: 'NENHUMA' }
]

const money = (value) => `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`

async function load() {
  await Promise.all([
    settingsStore.fetchRates(authStore.companyId),
    walletsStore.fetchWallets(authStore.companyId),
    settingsStore.fetchAccounts(authStore.companyId)
  ])
}

function openCreate() {
  editingRate.value = null
  const hasWallet = walletOptions.value.length > 0
  const hasAccount = desembolsoAccountOptions.value.length > 0
  form.value = {
    name: '',
    taxPercent: '',
    adminFeePercent: 0,
    vinculacao: hasWallet ? 'CARTEIRA' : hasAccount ? 'CONTA' : 'NENHUMA',
    walletId: hasWallet ? walletOptions.value[0].value : null,
    accountId: hasAccount ? desembolsoAccountOptions.value[0].value : null
  }
  showForm.value = true
}

function openEdit(rate) {
  editingRate.value = rate
  const vinculacao = rate.walletId ? 'CARTEIRA' : rate.accountId ? 'CONTA' : 'NENHUMA'
  form.value = {
    name: rate.name || '',
    taxPercent: Number(rate.tax) * 100,
    adminFeePercent: (Number(rate.administrativeFee) || 0) * 100,
    vinculacao,
    walletId: rate.walletId || null,
    accountId: rate.accountId || null
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingRate.value = null
}

function confirmDelete(rate) {
  editingToDelete.value = rate
  showDeleteConfirm.value = true
}

async function saveRate() {
  const f = form.value
  if (!f.name?.trim() || !f.taxPercent) {
    $q.notify({ type: 'warning', message: 'Preencha o nome e a taxa de juro', position: 'top' })
    return
  }
  if (f.vinculacao === 'CARTEIRA' && !f.walletId) {
    $q.notify({ type: 'warning', message: 'Selecione a carteira de financiamento', position: 'top' })
    return
  }
  if (f.vinculacao === 'CONTA' && !f.accountId) {
    $q.notify({ type: 'warning', message: 'Selecione a conta de desembolso', position: 'top' })
    return
  }

  const payload = {
    name: f.name.trim(),
    tax: Number(f.taxPercent) / 100,
    administrativeFee: (Number(f.adminFeePercent) || 0) / 100,
    companyId: authStore.companyId,
    vinculacao: f.vinculacao,
    walletId: f.vinculacao === 'CARTEIRA' ? f.walletId : null,
    accountId: f.vinculacao === 'CONTA' ? f.accountId : null
  }

  try {
    if (editingRate.value) {
      await settingsStore.updateRate(editingRate.value.id, payload)
      logUpdateRates()
      $q.notify({ type: 'positive', message: 'Taxa actualizada', position: 'top' })
    } else {
      await settingsStore.createRate(payload)
      logUpdateRates()
      $q.notify({ type: 'positive', message: 'Taxa criada', position: 'top' })
    }
    closeForm()
    await load()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || error.response?.data?.result || 'Erro ao guardar a taxa',
      position: 'top'
    })
  }
}

async function deleteRateConfirmed() {
  try {
    await settingsStore.deleteRate(editingToDelete.value.id)
    $q.notify({ type: 'positive', message: 'Taxa eliminada', position: 'top' })
    await load()
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar a taxa', position: 'top' })
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.panel-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $primary, #16a34a);
  box-shadow: 0 6px 16px rgba($primary, 0.25);
}

.glass-tile {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.tile-icon {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rate-card {
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  background: #fff;
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.09);
  }
}

.rate-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba($primary, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vinculo {
  display: flex;
  align-items: center;
  border-radius: 12px;
  padding: 8px 10px;
  background: $grey-2;
}

.vinculo-carteira { background: rgba(37, 99, 235, 0.08); }
.vinculo-conta { background: rgba(79, 70, 229, 0.08); }
.vinculo-none { background: rgba(148, 163, 184, 0.16); }

.dialog-md { width: 520px; max-width: 95vw; border-radius: 18px; }
.dialog-sm { width: 380px; max-width: 95vw; border-radius: 18px; }

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}

body.body--dark {
  .rate-card { background: $gray-800; border-color: $gray-700; }
  .glass-tile { background: rgba(30, 41, 59, 0.7); border-color: rgba(255, 255, 255, 0.06); }
  .vinculo { background: rgba(148, 163, 184, 0.14); }
}
</style>
