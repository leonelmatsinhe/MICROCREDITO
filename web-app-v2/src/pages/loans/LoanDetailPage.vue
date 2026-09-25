<template>
  <div class="loan-detail q-pa-md">
    <!-- ═══════ CARREGAMENTO / ERRO ═══════ -->
    <div v-if="loading && !detail" class="text-center q-pa-xl">
      <q-spinner-dots size="44px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A carregar o crédito…</div>
    </div>

    <q-card v-else-if="!detail" flat class="glass-card text-center q-pa-xl">
      <q-icon name="error_outline" size="52px" color="grey-4" />
      <div class="text-subtitle1 text-grey-7 q-mt-sm">{{ erro || 'Crédito não encontrado' }}</div>
      <q-btn flat no-caps color="primary" icon="arrow_back" label="Voltar aos créditos" class="q-mt-md" @click="voltar" />
    </q-card>

    <template v-else>
      <!-- ═══════ CABEÇALHO ═══════ -->
      <q-card flat class="glass-card q-mb-md header-card">
        <q-card-section class="q-pb-sm">
          <div class="row items-center q-col-gutter-sm no-wrap">
            <q-btn flat round dense icon="arrow_back" color="grey-7" @click="voltar">
              <q-tooltip>Voltar</q-tooltip>
            </q-btn>

            <q-avatar size="42px" class="cliente-avatar">{{ initials }}</q-avatar>

            <div class="col" style="min-width: 0">
              <div class="row items-center q-gutter-xs no-wrap">
                <span class="text-subtitle1 text-weight-bold ellipsis">{{ cliente?.name || 'Mutuário' }}</span>
                <q-badge rounded :color="statusCor" :label="statusLabel" />
              </div>
              <div class="text-caption text-grey-6 ellipsis">
                Conta {{ credito?.accountNumber ?? '—' }}
                <span v-if="cliente?.nuit"> · NUIT {{ cliente.nuit }}</span>
                <span v-if="cliente?.phone"> · {{ cliente.phone }}</span>
              </div>
            </div>

            <div class="col-auto q-gutter-xs no-wrap gt-sm">
              <q-btn
                outline
                no-caps
                rounded
                color="primary"
                icon="folder_open"
                label="Documentos"
                size="sm"
                @click="abrirDocumentos"
              />
              <q-btn
                unelevated
                no-caps
                rounded
                color="primary"
                icon="refresh"
                label="Actualizar"
                size="sm"
                :loading="loading"
                @click="carregar()"
              />
            </div>
          </div>

          <!-- Identificação do crédito + origem do capital -->
          <div class="row q-col-gutter-sm q-mt-md">
            <div class="col-6 col-md-3">
              <div class="mini-label">Crédito</div>
              <div class="mini-value">#{{ credito?.id }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="mini-label">Montante</div>
              <div class="mini-value">{{ money(credito?.amount) }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="mini-label">Taxa de juro</div>
              <div class="mini-value">{{ percent(credito?.interestRate) }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="mini-label">Desembolso</div>
              <div class="mini-value">{{ dateShort(credito?.disbursementDate) }}</div>
            </div>
          </div>

          <div class="row items-center q-mt-md no-wrap">
            <q-icon name="savings" size="16px" color="primary" class="q-mr-xs" />
            <template v-if="carteira">
              <q-badge :color="carteira.cor_badge || 'blue'" :label="carteira.codigo" />
              <div class="col q-ml-sm text-caption text-grey-8 ellipsis" style="min-width: 0">
                {{ carteira.nome }}
                <span v-if="carteira.parceiro_nome" class="text-grey-6"> · Parceiro {{ carteira.parceiro_nome }}</span>
              </div>
            </template>
            <template v-else>
              <q-badge color="grey-6" label="LEGADO" />
              <div class="col q-ml-sm text-caption text-grey-6">
                Geral MBRM — crédito anterior às carteiras de financiamento.
                <a class="text-primary" style="cursor: pointer" @click="abrirClassificacao">Classificar agora</a>
              </div>
            </template>
          </div>
        </q-card-section>
      </q-card>

      <!-- ═══════ KPIs ═══════ -->
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="tile in tiles" :key="tile.label" class="col-6 col-md-3">
          <q-card flat class="glass-card kpi-card q-pa-md">
            <div class="row items-center no-wrap">
              <div class="kpi-icon q-mr-sm" :style="{ background: tile.bg }">
                <q-icon :name="tile.icon" size="18px" :color="tile.color" />
              </div>
              <div style="min-width: 0">
                <div class="text-caption text-grey-6 ellipsis">{{ tile.label }}</div>
                <div class="text-subtitle1 text-weight-bold">{{ tile.value }}</div>
                <div v-if="tile.hint" class="text-caption text-grey-6 ellipsis" style="font-size: 10px">{{ tile.hint }}</div>
              </div>
            </div>
          </q-card>
        </div>
      </div>

      <!-- ═══════ ABAS ═══════ -->
      <q-card flat class="glass-card">
        <q-tabs
          v-model="tab"
          dense
          align="left"
          active-color="primary"
          indicator-color="primary"
          class="detail-tabs"
        >
          <q-tab name="pagamentos" icon="receipt_long" :label="`Pagamentos e Recibos (${pagamentos.length})`" />
          <q-tab name="prestacoes" icon="event_note" :label="`Prestações (${prestacoes.length})`" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated class="bg-transparent">
          <!-- ══════════ PAGAMENTOS / RECIBOS ══════════ -->
          <q-tab-panel name="pagamentos" class="q-pa-md">
            <q-banner v-if="resumo.pagamentos_sem_recibo > 0" dense rounded class="bg-orange-1 text-orange-10 q-mb-md">
              <template v-slot:avatar><q-icon name="receipt" /></template>
              <div class="row items-center no-wrap">
                <div class="col">
                  {{ resumo.pagamentos_sem_recibo }} pagamento(s) deste crédito ainda sem recibo emitido.
                </div>
                <q-btn
                  dense
                  no-caps
                  rounded
                  unelevated
                  color="orange-9"
                  icon="playlist_add_check"
                  label="Emitir em falta"
                  :loading="emitindoTodos"
                  @click="emitirTodos"
                />
              </div>
            </q-banner>

            <div v-if="pagamentos.length === 0" class="text-center q-pa-xl">
              <q-icon name="receipt_long" size="48px" color="grey-4" />
              <div class="text-subtitle2 text-grey-6 q-mt-sm">Ainda não há pagamentos registados neste crédito</div>
              <div class="text-caption text-grey-5">Os recibos são emitidos por pagamento individual.</div>
            </div>

            <q-table
              v-else
              :rows="pagamentos"
              :columns="colunasPagamentos"
              row-key="id"
              flat
              dense
              :pagination="{ rowsPerPage: 0 }"
              hide-bottom
              class="receipts-table"
            >
              <template v-slot:body-cell-paymentDate="props">
                <q-td :props="props">
                  <div class="text-weight-medium">{{ dateShort(props.row.paymentDate) }}</div>
                  <div v-if="props.row.staffName" class="text-caption text-grey-6" style="font-size: 10px">
                    {{ props.row.staffName }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-amount="props">
                <q-td :props="props" class="text-right">
                  <div class="text-weight-bold">{{ money(props.row.amount) }}</div>
                  <div v-if="Number(props.row.discountAmount) > 0" class="text-caption text-teal" style="font-size: 10px">
                    − {{ money(props.row.discountAmount) }} desconto
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-capitalAmount="props">
                <q-td :props="props" class="text-right">{{ money(props.row.capitalAmount) }}</q-td>
              </template>

              <template v-slot:body-cell-interestAmount="props">
                <q-td :props="props" class="text-right">{{ money(props.row.interestAmount) }}</q-td>
              </template>

              <template v-slot:body-cell-lateInterestAmount="props">
                <q-td :props="props" class="text-right">
                  <span :class="Number(props.row.lateInterestAmount) > 0 ? 'text-orange-8 text-weight-medium' : 'text-grey-5'">
                    {{ money(props.row.lateInterestAmount) }}
                  </span>
                </q-td>
              </template>

              <template v-slot:body-cell-paymentMethodLabel="props">
                <q-td :props="props">
                  <div class="text-caption ellipsis" style="max-width: 190px" :title="props.row.paymentMethodLabel">
                    {{ props.row.paymentMethodLabel || '—' }}
                  </div>
                  <div v-if="props.row.reference" class="text-caption text-grey-6" style="font-size: 10px">
                    Ref. {{ props.row.reference }}
                  </div>
                </q-td>
              </template>

              <!-- RECIBO: selo legal (número + hash) ou acção de emissão -->
              <template v-slot:body-cell-recibo="props">
                <q-td :props="props" class="text-center">
                  <q-btn
                    v-if="props.row.recibo"
                    flat
                    dense
                    no-caps
                    size="sm"
                    color="primary"
                    icon="verified"
                    :label="props.row.recibo.numero"
                    @click="abrirRecibo(props.row)"
                  >
                    <q-tooltip>Ver recibo (pré-visualizar, descarregar, imprimir, e-mail, validar QR)</q-tooltip>
                  </q-btn>
                  <span v-else class="text-caption text-grey-6">Sem recibo</span>
                  <div v-if="props.row.recibo?.hash_at" class="text-caption text-grey-6" style="font-family: monospace; font-size: 9px">
                    {{ String(props.row.recibo.hash_at).slice(0, 12) }}…
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-acoes="props">
                <q-td :props="props" class="text-center">
                  <div class="row items-center no-wrap justify-center" style="gap: 2px">
                    <q-btn
                      v-if="props.row.recibo"
                      flat
                      round
                      dense
                      size="sm"
                      icon="visibility"
                      color="primary"
                      @click="abrirRecibo(props.row)"
                    >
                      <q-tooltip>Ver recibo</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="props.row.recibo"
                      flat
                      round
                      dense
                      size="sm"
                      icon="autorenew"
                      color="grey-8"
                      :loading="reimprimindoId === props.row.id"
                      @click="reimprimir(props.row)"
                    >
                      <q-tooltip>Re-imprimir com o layout actual (mantém o número e o hash)</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-else
                      flat
                      round
                      dense
                      size="sm"
                      icon="receipt_long"
                      color="teal"
                      :loading="emitindoId === props.row.id"
                      @click="emitirRecibo(props.row)"
                    >
                      <q-tooltip>Emitir recibo deste pagamento</q-tooltip>
                    </q-btn>
                  </div>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- ══════════ PRESTAÇÕES ══════════ -->
          <q-tab-panel name="prestacoes" class="q-pa-md">
            <div v-if="prestacoes.length === 0" class="text-center q-pa-xl">
              <q-icon name="event_busy" size="48px" color="grey-4" />
              <div class="text-subtitle2 text-grey-6 q-mt-sm">Este crédito ainda não tem plano de amortização</div>
            </div>

            <q-table
              v-else
              :rows="prestacoes"
              :columns="colunasPrestacoes"
              row-key="id"
              flat
              dense
              :pagination="{ rowsPerPage: 0 }"
              hide-bottom
              class="receipts-table"
            >
              <template v-slot:body-cell-installmentOrder="props">
                <q-td :props="props" class="text-weight-medium">{{ props.row.installmentOrder || '—' }}</q-td>
              </template>

              <template v-slot:body-cell-dueDate="props">
                <q-td :props="props">{{ dateShort(props.row.dueDate) }}</q-td>
              </template>

              <template v-slot:body-cell-installment="props">
                <q-td :props="props" class="text-right">{{ money(props.row.installment) }}</q-td>
              </template>

              <template v-slot:body-cell-pago="props">
                <q-td :props="props" class="text-right">{{ money(props.row.paidAmount) }}</q-td>
              </template>

              <template v-slot:body-cell-pendente="props">
                <q-td :props="props" class="text-right">
                  <span :class="pendenteDe(props.row) > 0 ? 'text-weight-medium' : 'text-grey-5'">
                    {{ money(pendenteDe(props.row)) }}
                  </span>
                </q-td>
              </template>

              <template v-slot:body-cell-mora="props">
                <q-td :props="props" class="text-right">
                  <span :class="Number(props.row.chargedLatePaymentInterest || props.row.latePaymentInterest) > 0 ? 'text-orange-8' : 'text-grey-5'">
                    {{ money(props.row.chargedLatePaymentInterest || props.row.latePaymentInterest) }}
                  </span>
                </q-td>
              </template>

              <template v-slot:body-cell-estado="props">
                <q-td :props="props" class="text-center">
                  <q-badge rounded :color="estadoDaPrestacao(props.row).cor" :label="estadoDaPrestacao(props.row).label" />
                  <div v-if="props.row.chargedLateDays > 0" class="text-caption text-grey-6" style="font-size: 10px">
                    {{ props.row.chargedLateDays }} dia(s) de atraso
                  </div>
                </q-td>
              </template>
            </q-table>

            <div v-if="prestacoes.length > 0" class="row justify-end q-mt-sm">
              <q-card flat class="totais-card q-pa-sm">
                <div class="text-caption text-grey-7">
                  Total em dívida: <strong class="text-primary">{{ money(resumo.saldo_devedor) }}</strong>
                  · Prestações pagas: <strong>{{ resumo.prestacoes_pagas }}</strong>
                  · Pendentes: <strong>{{ resumo.prestacoes_pendentes }}</strong>
                  <span v-if="resumo.prestacoes_atraso"> · <strong class="text-negative">{{ resumo.prestacoes_atraso }} em atraso</strong></span>
                </div>
              </q-card>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </template>

    <!-- ═══════ CLASSIFICAR CARTEIRA (crédito legado) ═══════ -->
    <q-dialog v-model="classifyOpen">
      <q-card class="classify-dialog">
        <q-card-section class="dialog-head row items-center no-wrap">
          <q-icon name="account_balance" size="20px" class="q-mr-sm" />
          <div class="col">
            <div class="text-h6">Classificar carteira de financiamento</div>
            <div class="text-caption">
              Crédito n.º {{ credito?.id }} — a carteira passa a constar no crédito, nas prestações,
              nos pagamentos e nos recibos já emitidos.
            </div>
          </div>
          <q-btn flat round dense icon="close" color="white" @click="classifyOpen = false" />
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="classifyWalletId"
            :options="walletOptions"
            outlined
            dense
            emit-value
            map-options
            label="Carteira de financiamento *"
            :loading="walletsStore.loading"
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-badge :color="scope.opt.cor || 'blue'" :label="scope.opt.codigo" />
                </q-item-section>
                <q-item-section>
                  <q-item-label style="font-size: 13px">{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption style="font-size: 11px">
                    <template v-if="scope.opt.parceiro">Parceiro {{ scope.opt.parceiro }} · </template>
                    <template v-if="scope.opt.ilimitado">Sem limite analítico</template>
                    <template v-else>Disponível {{ money(scope.opt.saldo) }}</template>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-banner dense rounded class="bg-blue-1 text-blue-10 q-mt-md">
            <template v-slot:avatar><q-icon name="info" /></template>
            Não altera o valor pago nem as prestações — serve para o recibo, o relatório do financiador
            e o portal do parceiro identificarem a origem do capital.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="classifyOpen = false" />
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="done"
            label="Classificar"
            :disable="!classifyWalletId"
            :loading="classifying"
            @click="confirmarClassificacao"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ VISUALIZADOR DE RECIBO ═══════ -->
    <ReciboViewerDialog v-model="viewerOpen" :recibo="viewerRecibo" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatDateShort, formatInterestRate, getInitials } from '@/utils/formatters'
import { useWalletsStore } from '@/stores/wallets'
import ReciboViewerDialog from '@/components/recibos/ReciboViewerDialog.vue'

/**
 * DETALHE DO CRÉDITO
 * ------------------
 * Aba **Pagamentos e Recibos**: cada pagamento do crédito com o seu recibo
 * (pré-visualização, descarregar, imprimir, e-mail, WhatsApp e validação por QR)
 * e, quando ainda não existe, a emissão do recibo ali mesmo — sem passar pela
 * página global de Pagamentos.
 */
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const walletsStore = useWalletsStore()

const loanId = computed(() => Number(route.params.id))

const loading = ref(false)
const erro = ref('')
const detail = ref(null)
const prestacoes = ref([])
const totaisPrestacoes = ref(null)
const tab = ref('pagamentos')

const viewerOpen = ref(false)
const viewerRecibo = ref(null)
const classifyOpen = ref(false)
const classifyWalletId = ref(null)
const classifying = ref(false)

const walletOptions = computed(() => walletsStore.walletOptions || [])
const emitindoId = ref(null)
const emitindoTodos = ref(false)
const reimprimindoId = ref(null)

const credito = computed(() => detail.value?.credito || null)
const cliente = computed(() => detail.value?.cliente || null)
const carteira = computed(() => detail.value?.carteira || null)
const pagamentos = computed(() => detail.value?.pagamentos || [])
const resumo = computed(() => detail.value?.resumo || {})

const STATUS = {
  0: { label: 'Pendente', cor: 'orange-8' },
  1: { label: 'Desembolsado', cor: 'primary' },
  3: { label: 'Terminado', cor: 'teal' },
  2: { label: 'Rejeitado', cor: 'negative' },
  '-1': { label: 'Rejeitado', cor: 'negative' }
}
const statusLabel = computed(() => STATUS[Number(credito.value?.status)]?.label || '—')
const statusCor = computed(() => STATUS[Number(credito.value?.status)]?.cor || 'grey')

const initials = computed(() => getInitials(cliente.value?.name || '') || 'MB')

const tiles = computed(() => [
  {
    label: 'Total recebido',
    value: money(resumo.value.total_pago),
    hint: `${resumo.value.num_pagamentos || 0} pagamento(s)`,
    icon: 'payments',
    color: 'primary',
    bg: 'rgba(15,107,47,0.10)'
  },
  {
    label: 'Capital recebido',
    value: money(resumo.value.total_capital),
    hint: `Juros ${money(resumo.value.total_juros)}`,
    icon: 'savings',
    color: 'indigo-7',
    bg: 'rgba(63,81,181,0.10)'
  },
  {
    label: 'Mora recebida',
    value: money(resumo.value.total_mora),
    hint: `Mora gerada ${money(resumo.value.mora_gerada)}`,
    icon: 'schedule',
    color: 'orange-8',
    bg: 'rgba(239,108,0,0.10)'
  },
  {
    label: 'Saldo devedor',
    value: money(resumo.value.saldo_devedor),
    hint: `Próx. vencimento ${resumo.value.proximo_vencimento ? dateShort(resumo.value.proximo_vencimento) : '—'}`,
    icon: 'account_balance_wallet',
    color: 'teal',
    bg: 'rgba(0,150,136,0.10)'
  }
])

const colunasPagamentos = [
  { name: 'paymentDate', label: 'Data', field: 'paymentDate', align: 'left', sortable: true },
  { name: 'amount', label: 'Valor pago', field: 'amount', align: 'right', sortable: true },
  { name: 'capitalAmount', label: 'Capital', field: 'capitalAmount', align: 'right' },
  { name: 'interestAmount', label: 'Juros', field: 'interestAmount', align: 'right' },
  { name: 'lateInterestAmount', label: 'Mora', field: 'lateInterestAmount', align: 'right' },
  { name: 'paymentMethodLabel', label: 'Método de pagamento', field: 'paymentMethodLabel', align: 'left' },
  { name: 'recibo', label: 'Recibo', field: 'id', align: 'center' },
  { name: 'acoes', label: 'Ações', field: 'id', align: 'center' }
]

const colunasPrestacoes = [
  { name: 'installmentOrder', label: 'Prestação', field: 'installmentOrder', align: 'left', sortable: true },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'left', sortable: true },
  { name: 'installment', label: 'Valor', field: 'installment', align: 'right' },
  { name: 'pago', label: 'Pago', field: 'paidAmount', align: 'right' },
  { name: 'pendente', label: 'Pendente', field: 'paidAmount', align: 'right' },
  { name: 'mora', label: 'Mora', field: 'latePaymentInterest', align: 'right' },
  { name: 'estado', label: 'Estado', field: 'status', align: 'center' }
]

// ─── Formatação ───
const money = (value) => formatMoney(Number(value) || 0)
const dateShort = (value) => formatDateShort(value) || '—'
const percent = (value) => (Number(value) > 0 ? formatInterestRate(value) : 'A definir')

function pendenteDe(item) {
  return Math.max(0, Math.round(((Number(item.installment) || 0) - (Number(item.paidAmount) || 0)) * 100) / 100)
}

function estadoDaPrestacao(item) {
  if (Number(item.status) === 1) return { label: 'Paga', cor: 'primary' }
  const venc = item.dueDate ? new Date(String(item.dueDate).slice(0, 10)) : null
  const vencida = venc instanceof Date && !Number.isNaN(venc.getTime()) && venc < new Date()
  return vencida ? { label: 'Em atraso', cor: 'negative' } : { label: 'Pendente', cor: 'amber-8' }
}

// ─── Dados ───
async function carregar(silencioso = false) {
  if (!loanId.value) return
  if (!silencioso) loading.value = true
  try {
    const [{ data }, instalmentos] = await Promise.all([
      api.get(`/api/loan/${loanId.value}/detail`),
      api.get(`/api/loan/amortization/${loanId.value}`).catch(() => null)
    ])
    if (!data?.success) {
      erro.value = data?.message || 'Não foi possível carregar o crédito'
      detail.value = null
      return
    }
    erro.value = ''
    detail.value = data.result
    prestacoes.value = instalmentos?.data?.result || []
    totaisPrestacoes.value = instalmentos?.data?.totals || null
  } catch (error) {
    erro.value = error.response?.data?.message || 'Erro ao carregar os dados do crédito'
    $q.notify({ type: 'negative', message: erro.value, position: 'top' })
  } finally {
    loading.value = false
  }
}

function voltar() {
  router.push('/loans')
}

function abrirDocumentos() {
  router.push(`/loans/${loanId.value}/documents`)
}

/** Abre o diálogo de classificação da carteira deste crédito legado. */
function abrirClassificacao() {
  classifyWalletId.value = null
  classifyOpen.value = true
  if (walletOptions.value.length === 0) {
    walletsStore.fetchWallets(authStore.companyId).catch(() => {})
  }
}

/** Grava a carteira escolhida no crédito (propaga a prestações, pagamentos e recibos). */
async function confirmarClassificacao() {
  if (!classifyWalletId.value) return
  classifying.value = true
  try {
    const data = await walletsStore.classifyLoans(authStore.companyId, [
      { loanId: loanId.value, walletId: classifyWalletId.value }
    ])
    if (!data?.success) {
      $q.notify({ type: 'negative', message: data?.message || 'Erro ao classificar a carteira', position: 'top' })
      return
    }
    const carteira = walletOptions.value.find((w) => w.value === classifyWalletId.value)
    $q.notify({
      type: 'positive',
      message: `Crédito classificado na carteira ${carteira?.codigo || ''}`.trim(),
      position: 'top'
    })
    classifyOpen.value = false
    await carregar(true)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao classificar a carteira',
      position: 'top'
    })
  } finally {
    classifying.value = false
  }
}

/**
 * Abre o recibo já emitido no visualizador (pré-visualizar, descarregar,
 * imprimir, e-mail, WhatsApp e validar QR).
 */
function abrirRecibo(pagamento) {
  if (!pagamento?.recibo) return
  viewerRecibo.value = {
    ...pagamento.recibo,
    valor_pago: pagamento.recibo.valor_pago ?? pagamento.amount,
    customer_name: cliente.value?.name || '',
    customer_phone: cliente.value?.phone || '',
    wallet_nome: carteira.value?.nome || null
  }
  viewerOpen.value = true
}

/** Emite (ou devolve, se já existir) o recibo do pagamento e abre-o. */
async function emitirRecibo(pagamento) {
  emitindoId.value = pagamento.id
  try {
    const { data } = await api.post(`/api/recibos/gerar/${pagamento.id}`, {
      companyId: authStore.companyId
    })
    if (!data?.success) {
      $q.notify({ type: 'negative', message: data?.message || 'Erro ao emitir o recibo', position: 'top' })
      return
    }
    viewerRecibo.value = {
      ...data.result,
      customer_phone: cliente.value?.phone || ''
    }
    viewerOpen.value = true
    $q.notify({ type: 'positive', message: `Recibo ${data.result?.numero} emitido`, position: 'top' })
    await carregar(true)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao emitir o recibo',
      position: 'top'
    })
  } finally {
    emitindoId.value = null
  }
}

/** Re-imprime o PDF com o layout actual, mantendo número, hash e sequência AT. */
async function reimprimir(pagamento) {
  if (!pagamento?.recibo) return
  reimprimindoId.value = pagamento.id
  try {
    const { data } = await api.get(`/api/recibos/${pagamento.recibo.id}/pdf`, {
      params: { regenerate: 1 },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `Recibo-${pagamento.recibo.numero}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 30000)
    $q.notify({
      type: 'positive',
      message: `Recibo ${pagamento.recibo.numero} re-impresso com o layout actual`,
      position: 'top'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Não foi possível re-imprimir o recibo',
      position: 'top'
    })
  } finally {
    reimprimindoId.value = null
  }
}

/** Emite, em sequência, os recibos de todos os pagamentos que ainda não têm. */
async function emitirTodos() {
  const alvo = pagamentos.value.filter((p) => !p.recibo)
  if (alvo.length === 0) return
  emitindoTodos.value = true
  let emitidos = 0
  let falhas = 0
  try {
    for (const pagamento of alvo) {
      try {
        const { data } = await api.post(`/api/recibos/gerar/${pagamento.id}`, {
          companyId: authStore.companyId
        })
        if (data?.success) emitidos += 1
        else falhas += 1
      } catch {
        falhas += 1
      }
    }
    $q.notify({
      type: falhas ? 'warning' : 'positive',
      message: falhas
        ? `${emitidos} recibo(s) emitido(s), ${falhas} falha(s)`
        : `${emitidos} recibo(s) emitido(s) com sucesso`,
      position: 'top'
    })
    await carregar(true)
  } finally {
    emitindoTodos.value = false
  }
}

onMounted(() => carregar())

watch(loanId, (novo, antigo) => {
  if (novo !== antigo) {
    tab.value = 'pagamentos'
    carregar()
  }
})
</script>

<style lang="scss" scoped>
.loan-detail {
  max-width: 1400px;
  margin: 0 auto;
}

.classify-dialog {
  width: 560px;
  max-width: 96vw;
  border-radius: 18px;
  overflow: hidden;
}

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}

.glass-card {
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  box-shadow: 0 6px 22px rgba(15, 23, 42, 0.06);
}

.header-card {
  border-left: 4px solid $primary;
}

.cliente-avatar {
  background: rgba(15, 107, 47, 0.12);
  color: $primary;
  font-weight: 700;
  font-size: 15px;
}

.mini-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.mini-value {
  font-size: 14px;
  font-weight: 600;
}

.kpi-card {
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 26px rgba(15, 23, 42, 0.10);
  }
}

.kpi-icon {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-tabs {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 18px 18px 0 0;
}

.receipts-table {
  :deep(thead tr th) {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #6b7280;
  }
}

.totais-card {
  background: rgba(15, 107, 47, 0.06);
  border-radius: 12px;
}

.body--dark {
  .glass-card {
    background: rgba(30, 41, 59, 0.72);
    border-color: rgba(255, 255, 255, 0.06);
  }

  .detail-tabs {
    background: rgba(30, 41, 59, 0.5);
  }

  .totais-card {
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>
