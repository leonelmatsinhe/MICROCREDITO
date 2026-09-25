<template>
  <div>
    <!-- ═══════ CABEÇALHO ═══════ -->
    <div class="row items-center q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md">
        <div class="row items-center no-wrap">
          <div class="panel-icon q-mr-sm"><q-icon name="savings" size="20px" color="white" /></div>
          <div>
            <div class="text-subtitle1 text-weight-bold">Carteiras de Financiamento</div>
            <div class="text-caption text-grey-6">
              Dinheiro <strong>analítico</strong> por fundo/parceiro. O dinheiro real está nas contas de desembolso
              (<strong>{{ money(saldoRealDisponivel) }}</strong> disponível).
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-auto q-gutter-xs no-wrap">
        <q-btn color="primary" unelevated no-caps rounded icon="add" label="Nova Carteira" @click="openForm()" />
        <q-btn
          outline
          color="primary"
          no-caps
          rounded
          icon="link"
          :label="unclassifiedCount > 0 ? `Classificar créditos antigos (${unclassifiedCount})` : 'Classificar créditos antigos'"
          @click="classifyDialog = true"
        >
          <q-tooltip>
            Créditos anteriores às carteiras: ao classificar, o recibo e o relatório do financiador passam a
            identificar a origem do capital.
          </q-tooltip>
        </q-btn>
        <q-btn outline color="deep-orange" no-caps rounded icon="cleaning_services" label="Limpar carteiras de teste" @click="openPurge" />
        <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="load">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══════ CONSOLIDADO ═══════ -->
    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="tile in consolidated" :key="tile.label" class="col-6 col-md-3">
        <q-card flat class="glass-tile">
          <q-card-section class="q-pa-md">
            <div class="row items-center no-wrap">
              <div class="tile-icon q-mr-sm" :style="{ background: tile.bg }">
                <q-icon :name="tile.icon" size="18px" :color="tile.color" />
              </div>
              <div style="min-width: 0">
                <div class="text-caption text-grey-6 ellipsis">{{ tile.label }}</div>
                <div class="text-subtitle1 text-weight-bold" :class="tile.class">{{ tile.value }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════ CARREGAMENTO / VAZIO ═══════ -->
    <div v-if="loading && wallets.length === 0" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>
    <q-card v-else-if="wallets.length === 0" flat class="glass-tile text-center q-pa-xl">
      <q-icon name="savings" size="52px" color="grey-4" />
      <div class="text-subtitle1 text-grey-6 q-mt-sm">Ainda não existem carteiras de financiamento</div>
      <q-btn color="primary" rounded unelevated no-caps label="Criar primeira carteira" class="q-mt-md" @click="openForm()" />
    </q-card>

    <!-- ═══════ CARTOES POR CARTEIRA ═══════ -->
    <div v-else class="row q-col-gutter-md">
      <div v-for="w in wallets" :key="w.id" class="col-12 col-md-6 col-xl-4">
        <q-card flat class="wallet-card" :class="{ 'wallet-off': !Number(w.is_ativa) }">
          <!-- header gradiente -->
          <div class="wallet-head" :class="`head-${w.cor_badge || 'blue'}`">
            <div class="row items-center no-wrap">
              <q-badge :color="w.cor_badge || 'blue'" :label="w.codigo" class="q-mr-sm" />
              <div class="col ellipsis text-weight-bold text-white" style="font-size: 13px">
                {{ w.parceiro_nome || w.nome }}
              </div>
              <q-btn flat round dense size="sm" icon="more_vert" color="white" class="wallet-menu">
                <q-menu anchor="bottom right" self="top right">
                  <q-list style="min-width: 210px">
                    <q-item clickable v-close-popup @click="openForm(w)">
                      <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar carteira</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openDetail(w)">
                      <q-item-section avatar><q-icon name="insights" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Ver detalhes</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openReport(w)">
                      <q-item-section avatar><q-icon name="assessment" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Relatório do financiador</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="toggleActive(w)">
                      <q-item-section avatar>
                        <q-icon :name="Number(w.is_ativa) ? 'block' : 'check_circle'" size="16px" />
                      </q-item-section>
                      <q-item-section style="font-size: 13px">{{ Number(w.is_ativa) ? 'Desactivar' : 'Activar' }}</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openDelete(w)">
                      <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                      <q-item-section class="text-negative" style="font-size: 13px">Apagar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
            <div class="text-caption wallet-head-sub ellipsis">{{ w.nome }}</div>
            <div class="row items-center q-gutter-xs q-mt-xs">
              <q-badge v-if="w.taxa_juro !== null" outline color="white" :label="`Taxa ${(Number(w.taxa_juro) * 100).toFixed(1)}%`" style="font-size: 9px" />
              <q-badge v-if="Number(w.tem_portal)" :color="Number(w.portal_ativo) ? 'green-4' : 'grey-5'" text-color="white" label="Portal" style="font-size: 9px" />
              <q-badge v-if="Number(w.is_parceiro_externo)" outline color="white" label="Parceiro externo" style="font-size: 9px" />
              <q-badge v-if="!Number(w.is_ativa)" color="grey-8" text-color="white" label="Inactiva" style="font-size: 9px" />
            </div>
          </div>

          <q-card-section class="q-pa-md">
            <!-- Grid 2x2 -->
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="kpi-label">Alocado</div>
                <div class="kpi-value">{{ w.allocated_amount === null ? 'Sem limite' : money(w.allocated_amount) }}</div>
              </div>
              <div class="col-6">
                <div class="kpi-label">Desembolsado</div>
                <div class="kpi-value text-primary">{{ money(w.disbursed) }}</div>
              </div>
              <div class="col-6">
                <div class="kpi-label">Disponível</div>
                <div class="kpi-value" :class="availClass(w)">{{ w.saldo_analitico === null ? 'Sem limite' : money(w.saldo_analitico) }}</div>
              </div>
              <div class="col-6">
                <div class="kpi-label">Recebimentos</div>
                <div class="kpi-value text-positive">{{ money(w.total_recebimentos) }}</div>
              </div>
            </div>

            <div v-if="w.allocated_amount !== null" class="q-mt-sm">
              <div class="row items-center justify-between text-caption text-grey-6">
                <span>{{ Math.round((Number(w.utilizacao) || 0) * 100) }}% utilizado</span>
                <span>{{ money(w.disbursed) }} / {{ money(w.allocated_amount) }}</span>
              </div>
              <q-linear-progress
                :value="Number(w.utilizacao) || 0"
                rounded size="7px" class="q-mt-xs"
                :color="barColor(w)" track-color="grey-3"
              />
            </div>

            <!-- Linha 2: dentro da carteira -->
            <q-separator class="q-my-sm" />
            <div class="row q-col-gutter-sm">
              <div class="col-4">
                <div class="kpi-label"><q-icon name="account_balance_wallet" size="11px" /> Créditos</div>
                <div class="kpi-mini">{{ numero(w.num_creditos) }}</div>
              </div>
              <div class="col-4">
                <div class="kpi-label"><q-icon name="task_alt" size="11px" /> Reembolsados</div>
                <div class="kpi-mini">{{ numero(w.prestacoes_pagas) }}/{{ numero(w.prestacoes_total) }}</div>
              </div>
              <div class="col-4">
                <div class="kpi-label"><q-icon name="percent" size="11px" /> Taxa média</div>
                <div class="kpi-mini">{{ w.taxa_media === null ? '—' : `${(Number(w.taxa_media) * 100).toFixed(1)}%` }}</div>
              </div>
              <div class="col-4">
                <div class="kpi-label"><q-icon name="savings" size="11px" /> Juros gerados</div>
                <div class="kpi-mini">{{ money(w.juros_gerados) }}</div>
              </div>
              <div class="col-4">
                <div class="kpi-label"><q-icon name="payments" size="11px" /> Juros recebidos</div>
                <div class="kpi-mini text-positive">{{ money(w.total_juros_recebidos) }}</div>
              </div>
              <div class="col-4">
                <div class="kpi-label"><q-icon name="warning_amber" size="11px" /> Mora gerada</div>
                <div class="kpi-mini" :class="Number(w.mora_gerada) > 0 ? 'text-negative' : ''">{{ money(w.mora_gerada) }}</div>
              </div>
              <div class="col-6">
                <div class="kpi-label"><q-icon name="trending_up" size="11px" /> Previsão de lucro</div>
                <div class="kpi-mini text-deep-purple">{{ money(w.previsao_lucro) }}</div>
              </div>
              <div class="col-6">
                <div class="kpi-label"><q-icon name="pending_actions" size="11px" /> Saldo a receber</div>
                <div class="kpi-mini text-deep-orange">{{ money(w.saldo_a_receber) }}</div>
              </div>
            </div>
          </q-card-section>

          <q-separator />
          <q-card-actions class="q-px-md q-py-xs">
            <q-icon name="info" size="14px" color="grey-6" class="q-mr-xs" />
            <span class="text-caption text-grey-6">
              {{ numero(w.num_creditos) }} crédito(s) · {{ numero(w.num_clientes) }} cliente(s) · juros {{ money(w.total_juros_recebidos) }} · mora {{ money(w.total_mora_recebida) }}
              <span v-if="Number(w.prestacoes_atraso) > 0" class="text-negative"> · {{ numero(w.prestacoes_atraso) }} em atraso</span>
            </span>
            <q-space />
            <q-btn flat dense no-caps size="sm" color="primary" label="Ver detalhes" @click="openDetail(w)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- ═══════ DIALOG: CRIAR/EDITAR ═══════ -->
    <q-dialog v-model="formDialog" persistent>
      <q-card class="dialog-xl">
        <q-card-section class="row items-center dialog-head">
          <q-icon :name="form.id ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ form.id ? 'Editar Carteira' : 'Nova Carteira de Financiamento' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="formDialog = false" />
        </q-card-section>
        <q-card-section class="q-gutter-y-md scroll" style="max-height: 68vh">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-4">
              <q-input v-model="form.codigo" outlined dense label="Código *" hint="Ex.: KMAD, PME_12" :rules="[(v) => !!v || 'Obrigatório']" />
            </div>
            <div class="col-12 col-sm-8">
              <q-input v-model="form.nome" outlined dense label="Nome da carteira *" :rules="[(v) => !!v || 'Obrigatório']" />
            </div>
          </div>
          <q-input v-model="form.descricao" outlined dense type="textarea" autogrow label="Descrição / finalidade" />
          <q-select
            v-model="form.tipo"
            :options="[{ label: 'FINANCIAMENTO (apenas)', value: 'FINANCIAMENTO' }]"
            outlined dense emit-value map-options label="Tipo *" disable
            hint="Carteiras analíticas são sempre de financiamento (nunca de reembolso)."
          />
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model.number="form.allocated_amount" type="number" outlined dense prefix="MT" label="Capital alocado (analítico)" hint="Deixe vazio para fundo sem limite." />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model.number="form.initial_disbursed_amount" type="number" outlined dense prefix="MT" label="Desembolsado anterior (base)" hint="Histórico já desembolsado antes desta carteira." />
            </div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model.number="form.taxa_juro" type="number" step="0.1" outlined dense label="Taxa de juro esperada (%)" hint="Ex.: 12 para 12% ao mês." />
            </div>
            <div class="col-12 col-sm-6">
              <q-select v-model="form.cor_badge" :options="colorOptions" outlined dense emit-value map-options label="Cor do badge" />
            </div>
          </div>

          <q-separator />
          <div class="text-subtitle2">Parceiro financiador externo</div>
          <q-toggle v-model="form.is_parceiro_externo" label="Esta carteira pertence a um parceiro externo" dense />
          <template v-if="form.is_parceiro_externo">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input v-model="form.parceiro_nome" outlined dense label="Nome do parceiro *" :rules="[(v) => !form.is_parceiro_externo || !!v || 'Obrigatório']" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.parceiro_email" outlined dense label="E-mail (relatórios)" />
              </div>
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input v-model="form.parceiro_nuit" outlined dense label="NUIT do parceiro" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.parceiro_contacto" outlined dense label="Contacto" />
              </div>
            </div>
            <q-toggle v-model="form.tem_portal" label="Dar acesso ao portal do financiador" dense />
            <q-toggle v-if="form.tem_portal" v-model="form.portal_ativo" label="Portal activo" dense />
          </template>

          <q-toggle v-model="form.is_ativa" label="Carteira activa" dense />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancelar" :disable="saving" @click="formDialog = false" />
          <q-btn unelevated no-caps rounded color="primary" :label="form.id ? 'Guardar' : 'Criar carteira'" :loading="saving" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: APAGAR ═══════ -->
    <q-dialog v-model="deleteDialog" persistent>
      <q-card class="dialog-md">
        <q-card-section class="text-center q-pb-none">
          <q-avatar icon="delete" color="negative" text-color="white" size="52px" />
          <div class="text-h6 q-mt-sm">Apagar carteira {{ deleting?.codigo }}?</div>
          <div class="text-caption text-grey-6">{{ deleting?.nome }}</div>
        </q-card-section>
        <q-card-section v-if="dependenciesLoading" class="text-center">
          <q-spinner-dots size="30px" color="primary" />
        </q-card-section>
        <q-card-section v-else class="q-gutter-y-sm">
          <div class="row q-col-gutter-sm text-center">
            <div v-for="dep in dependencyTiles" :key="dep.label" class="col-4">
              <div class="kpi-label">{{ dep.label }}</div>
              <div class="kpi-mini" :class="dep.class">{{ dep.value }}</div>
            </div>
          </div>
          <q-banner v-if="!dependencies?.pode_apagar" dense rounded class="bg-orange-1 text-orange-10">
            {{ dependencies?.motivo }}
          </q-banner>
          <q-banner v-else dense rounded class="bg-red-1 text-red-10">
            Esta acção não pode ser desfeita. Escreva <strong>{{ deleting?.codigo }}</strong> para confirmar.
          </q-banner>
          <q-input
            v-if="dependencies?.pode_apagar"
            v-model="deleteConfirmText" outlined dense
            :label="`Digite ${deleting?.codigo}`"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Fechar" @click="deleteDialog = false" />
          <q-btn
            v-if="!dependencies?.pode_apagar"
            unelevated no-caps rounded color="warning" label="Desactivar em vez disso"
            :loading="saving" @click="deactivateInstead"
          />
          <q-btn
            v-else
            unelevated no-caps rounded color="negative" label="Apagar definitivamente"
            :disable="deleteConfirmText !== deleting?.codigo"
            :loading="saving" @click="confirmDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: LIMPAR CARTEIRAS DE TESTE ═══════ -->
    <q-dialog v-model="purgeDialog">
      <q-card class="dialog-lg">
        <q-card-section class="row items-center dialog-head">
          <q-icon name="cleaning_services" size="20px" class="q-mr-sm" />
          <div class="text-h6">Limpar carteiras de teste</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="purgeDialog = false" />
        </q-card-section>
        <q-card-section>
          <div class="text-caption text-grey-6 q-mb-sm">
            Carteiras <strong>sem qualquer movimento</strong> (0 créditos, 0 recebimentos, 0 prestações, 0 utilizadores)
            com código <code>TESTE…</code> ou criadas nos últimos 7 dias.
          </div>
          <div v-if="testCandidates.length === 0" class="text-center q-pa-lg text-grey-6">
            <q-icon name="check_circle" size="40px" color="positive" />
            <div class="q-mt-sm">Nada para limpar — não há carteiras de teste sem movimento.</div>
          </div>
          <q-list v-else separator>
            <q-item v-for="candidate in testCandidates" :key="candidate.id" tag="label">
              <q-item-section avatar>
                <q-checkbox v-model="purgeSelection" :val="candidate.id" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <q-badge :color="candidate.cor_badge || 'grey'" :label="candidate.codigo" class="q-mr-sm" />
                  {{ candidate.nome }}
                </q-item-label>
                <q-item-label caption>
                  {{ candidate.is_teste ? 'Código de teste' : 'Criada recentemente' }}
                  <span v-if="candidate.taxas"> · {{ candidate.taxas }} taxa(s) serão desvinculadas</span>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancelar" @click="purgeDialog = false" />
          <q-btn
            unelevated no-caps rounded color="deep-orange" label="Apagar selecionadas"
            :disable="purgeSelection.length === 0" :loading="saving" @click="confirmPurge"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: DETALHES ═══════ -->
    <q-dialog v-model="detailDialog">
      <q-card class="dialog-lg">
        <q-card-section class="row items-center dialog-head">
          <q-badge :color="detailWallet?.cor_badge || 'blue'" :label="detailWallet?.codigo" class="q-mr-sm" />
          <div class="text-h6 ellipsis">{{ detailWallet?.nome }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="detailDialog = false" />
        </q-card-section>
        <q-card-section class="scroll" style="max-height: 70vh">
          <div class="row q-col-gutter-md">
            <div v-for="item in detailItems" :key="item.label" class="col-6 col-sm-4">
              <q-card flat class="glass-tile q-pa-sm">
                <div class="kpi-label">{{ item.label }}</div>
                <div class="text-subtitle2 text-weight-bold" :class="item.class">{{ item.value }}</div>
              </q-card>
            </div>
          </div>
          <div v-if="detailWallet?.descricao" class="text-caption text-grey-6 q-mt-md">{{ detailWallet.descricao }}</div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: CLASSIFICAR CRÉDITOS ANTIGOS ═══════ -->
    <ClassifyLoansDialog v-model="classifyDialog" @classified="load" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ClassifyLoansDialog from '@/components/financing/ClassifyLoansDialog.vue'
import { useWalletsStore } from '@/stores/wallets'

/**
 * CARTEIRAS DE FINANCIAMENTO (Admin) — CRUD + KPIs + regras de apagar.
 *  · sem movimento → pode ser APAGADA (com dupla confirmação);
 *  · com movimento → só pode ser DESACTIVADA (histórico preservado);
 *  · carteiras de teste sem movimento podem ser limpas em lote.
 */
const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const walletsStore = useWalletsStore()

const formDialog = ref(false)
const deleteDialog = ref(false)
const purgeDialog = ref(false)
const detailDialog = ref(false)
const classifyDialog = ref(false)
// Quantos créditos ainda não têm carteira (mostrado no botão de classificação).
const unclassifiedCount = ref(0)
const deleting = ref(null)
const detailWallet = ref(null)
const dependencies = ref(null)
const dependenciesLoading = ref(false)
const deleteConfirmText = ref('')
const purgeSelection = ref([])

const wallets = computed(() => walletsStore.wallets)
const loading = computed(() => walletsStore.loading)
const saving = computed(() => walletsStore.saving)
const testCandidates = computed(() => walletsStore.testCandidates)
const summary = computed(() => walletsStore.summary || {})
const saldoRealDisponivel = computed(() => Number(walletsStore.saldoReal?.available) || 0)

const colorOptions = ['blue', 'orange', 'green', 'grey', 'purple', 'teal', 'brown', 'deep-orange', 'pink', 'cyan']
  .map((color) => ({ label: color, value: color }))

const money = (value) => `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
const numero = (value) => Number(value) || 0

const consolidated = computed(() => [
  {
    label: 'Capital alocado (analítico)',
    value: money(summary.value.capital_alocado),
    icon: 'account_balance',
    color: 'blue-7', bg: 'rgba(37,99,235,0.12)', class: 'text-primary'
  },
  {
    label: 'Desembolsado (todas as carteiras)',
    value: money(summary.value.total_desembolsado),
    icon: 'arrow_upward',
    color: 'deep-purple', bg: 'rgba(124,58,237,0.12)', class: 'text-deep-purple'
  },
  {
    label: 'Recebimentos (todas as carteiras)',
    value: money(summary.value.total_recebimentos),
    icon: 'arrow_downward',
    color: 'green-7', bg: 'rgba(5,150,105,0.12)', class: 'text-positive'
  },
  {
    label: 'Saldo real para desembolsos',
    value: money(saldoRealDisponivel.value),
    icon: 'account_balance_wallet',
    color: 'deep-orange', bg: 'rgba(234,88,12,0.12)', class: 'text-deep-orange'
  }
])

const dependencyTiles = computed(() => {
  const d = dependencies.value || {}
  return [
    { label: 'Créditos', value: numero(d.creditos) },
    { label: 'Recebimentos', value: numero(d.recebimentos) },
    { label: 'Prestações', value: numero(d.prestacoes) },
    { label: 'Utilizadores', value: numero(d.utilizadores) },
    { label: 'Taxas', value: numero(d.taxas) },
    { label: 'Recibos', value: numero(d.recibos) }
  ]
})

const detailItems = computed(() => {
  const w = detailWallet.value
  if (!w) return []
  return [
    { label: 'Capital alocado', value: w.allocated_amount === null ? 'Sem limite' : money(w.allocated_amount) },
    { label: 'Desembolsado', value: money(w.disbursed), class: 'text-primary' },
    { label: 'Disponível (analítico)', value: w.saldo_analitico === null ? 'Sem limite' : money(w.saldo_analitico) },
    { label: 'Utilização', value: `${Math.round((Number(w.utilizacao) || 0) * 100)}%` },
    { label: 'Créditos / clientes', value: `${numero(w.num_creditos)} / ${numero(w.num_clientes)}` },
    { label: 'Taxa média', value: w.taxa_media === null ? '—' : `${(Number(w.taxa_media) * 100).toFixed(2)}%` },
    { label: 'Prestações pagas', value: `${numero(w.prestacoes_pagas)} / ${numero(w.prestacoes_total)}` },
    { label: 'Prestações pendentes', value: numero(w.prestacoes_pendentes) },
    { label: 'Prestações em atraso', value: numero(w.prestacoes_atraso), class: Number(w.prestacoes_atraso) > 0 ? 'text-negative' : '' },
    { label: 'Juros gerados', value: money(w.juros_gerados) },
    { label: 'Juros recebidos', value: money(w.total_juros_recebidos), class: 'text-positive' },
    { label: 'Previsão de lucro', value: money(w.previsao_lucro), class: 'text-deep-purple' },
    { label: 'Mora gerada', value: money(w.mora_gerada) },
    { label: 'Mora recebida', value: money(w.total_mora_recebida) },
    { label: 'Saldo a receber', value: money(w.saldo_a_receber), class: 'text-deep-orange' },
    { label: 'Último desembolso', value: w.ultimo_desembolso ? String(w.ultimo_desembolso).slice(0, 10) : '—' }
  ]
})

const emptyForm = () => ({
  id: null,
  codigo: '',
  nome: '',
  descricao: '',
  tipo: 'FINANCIAMENTO',
  parceiro_nome: '',
  is_parceiro_externo: false,
  parceiro_email: '',
  parceiro_nuit: '',
  parceiro_contacto: '',
  allocated_amount: null,
  initial_disbursed_amount: 0,
  taxa_juro: null,
  cor_badge: 'blue',
  is_ativa: true,
  tem_portal: false,
  portal_ativo: true
})
const form = ref(emptyForm())

const round = (value) => Math.round((Number(value) || 0) * 100) / 100
const barColor = (w) => {
  const used = Number(w.utilizacao) || 0
  if (used >= 1) return 'negative'
  if (used >= 0.85) return 'orange'
  return 'positive'
}
const availClass = (w) => {
  if (w.saldo_analitico === null) return 'text-grey-7'
  return Number(w.saldo_analitico) > 0 ? 'text-positive' : 'text-negative'
}

async function load() {
  try {
    await walletsStore.fetchWallets(authStore.companyId)
    // Contagem de créditos ainda sem carteira (alimenta o botão de classificação).
    const pendentes = await walletsStore.fetchUnclassifiedLoans(authStore.companyId)
    unclassifiedCount.value = Array.isArray(pendentes) ? pendentes.length : 0
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao carregar as carteiras', position: 'top' })
  }
}

function openForm(wallet = null) {
  form.value = wallet
    ? {
        id: wallet.id,
        codigo: wallet.codigo,
        nome: wallet.nome,
        descricao: wallet.descricao || '',
        tipo: 'FINANCIAMENTO',
        parceiro_nome: wallet.parceiro_nome || '',
        is_parceiro_externo: !!Number(wallet.is_parceiro_externo),
        parceiro_email: wallet.parceiro_email || '',
        parceiro_nuit: wallet.parceiro_nuit || '',
        parceiro_contacto: wallet.parceiro_contacto || '',
        allocated_amount: wallet.allocated_amount === null ? null : Number(wallet.allocated_amount),
        initial_disbursed_amount: Number(wallet.initial_disbursed_amount) || 0,
        taxa_juro: wallet.taxa_juro === null ? null : round(Number(wallet.taxa_juro) * 100),
        cor_badge: wallet.cor_badge || 'blue',
        is_ativa: !!Number(wallet.is_ativa),
        tem_portal: !!Number(wallet.tem_portal),
        portal_ativo: !!Number(wallet.portal_ativo)
      }
    : emptyForm()
  formDialog.value = true
}

async function submitForm() {
  const f = form.value
  if (!f.codigo?.trim() || !f.nome?.trim()) {
    $q.notify({ type: 'warning', message: 'Preencha o código e o nome da carteira', position: 'top' })
    return
  }
  if (f.is_parceiro_externo && !f.parceiro_nome?.trim()) {
    $q.notify({ type: 'warning', message: 'Indique o nome do parceiro financiador', position: 'top' })
    return
  }

  // Guarda contra apagar a base histórica por engano: basta limpar o campo no
  // formulário para o desembolsado analítico da carteira ir a zero.
  if (f.id) {
    const baseOriginal = Number(wallets.value.find((row) => Number(row.id) === Number(f.id))?.initial_disbursed_amount) || 0
    const baseNova = Number(f.initial_disbursed_amount) || 0
    if (baseOriginal > 0 && baseNova === 0) {
      const confirmado = await new Promise((resolve) => {
        $q.dialog({
          title: 'Limpar a base histórica da carteira?',
          message: `Esta carteira tem ${money(baseOriginal)} de capital já desembolsado registado (${f.codigo}). Ao guardar sem esse valor, o desembolsado analítico e o disponível da carteira mudam.`,
          cancel: { label: 'Voltar', noCaps: true, flat: true },
          ok: { label: 'Sim, limpar base', noCaps: true, unelevated: true, color: 'negative' },
          persistent: true
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
          .onDismiss(() => resolve(false))
      })
      if (!confirmado) return
    }
  }

  try {
    const payload = {
      companyId: authStore.companyId,
      codigo: f.codigo.trim(),
      nome: f.nome.trim(),
      descricao: f.descricao,
      tipo: 'FINANCIAMENTO',
      parceiro_nome: f.parceiro_nome || null,
      is_parceiro_externo: f.is_parceiro_externo,
      parceiro_email: f.parceiro_email || null,
      parceiro_nuit: f.parceiro_nuit || null,
      parceiro_contacto: f.parceiro_contacto || null,
      allocated_amount: f.allocated_amount === '' || f.allocated_amount === null ? null : Number(f.allocated_amount),
      initial_disbursed_amount: Number(f.initial_disbursed_amount) || 0,
      taxa_juro: f.taxa_juro === '' || f.taxa_juro === null ? null : Number(f.taxa_juro) / 100,
      cor_badge: f.cor_badge,
      is_ativa: f.is_ativa,
      tem_portal: f.is_parceiro_externo ? f.tem_portal : false,
      portal_ativo: f.portal_ativo
    }
    const data = f.id
      ? await walletsStore.updateWallet(f.id, payload)
      : await walletsStore.createWallet(payload)
    if (data?.success === false) {
      $q.notify({ type: 'negative', message: data.message || 'Erro ao guardar a carteira', position: 'top' })
      return
    }
    $q.notify({ type: 'positive', message: f.id ? 'Carteira actualizada' : 'Carteira criada', position: 'top' })
    formDialog.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao guardar a carteira', position: 'top' })
  }
}

async function toggleActive(wallet) {
  try {
    const data = await walletsStore.deactivateWallet(wallet.id, !Number(wallet.is_ativa))
    if (data?.success === false) {
      $q.notify({ type: 'negative', message: data.message, position: 'top' })
      return
    }
    $q.notify({ type: 'positive', message: data?.message || 'Estado actualizado', position: 'top' })
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar o estado', position: 'top' })
  }
}

async function openDelete(wallet) {
  deleting.value = wallet
  dependencies.value = null
  deleteConfirmText.value = ''
  deleteDialog.value = true
  dependenciesLoading.value = true
  try {
    dependencies.value = await walletsStore.fetchWalletDependencies(wallet.id)
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao verificar a carteira', position: 'top' })
  } finally {
    dependenciesLoading.value = false
  }
}

async function confirmDelete() {
  try {
    const data = await walletsStore.deleteWallet(deleting.value.id)
    if (data?.success === false) {
      $q.notify({ type: 'negative', message: data.message, position: 'top' })
      return
    }
    $q.notify({ type: 'positive', message: data?.message || 'Carteira apagada', position: 'top' })
    deleteDialog.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao apagar a carteira', position: 'top' })
  }
}

async function deactivateInstead() {
  try {
    const data = await walletsStore.deactivateWallet(deleting.value.id, false)
    $q.notify({ type: data?.success === false ? 'negative' : 'positive', message: data?.message || 'Carteira desactivada', position: 'top' })
    deleteDialog.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao desactivar', position: 'top' })
  }
}

async function openPurge() {
  purgeSelection.value = []
  purgeDialog.value = true
  try {
    await walletsStore.fetchTestCandidates(authStore.companyId)
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao listar carteiras de teste', position: 'top' })
  }
}

async function confirmPurge() {
  try {
    const data = await walletsStore.purgeTestWallets(authStore.companyId, purgeSelection.value)
    $q.notify({
      type: data?.success === false ? 'negative' : 'positive',
      message: data?.message || 'Carteiras de teste removidas',
      position: 'top'
    })
    purgeDialog.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao limpar as carteiras', position: 'top' })
  }
}

function openDetail(wallet) {
  detailWallet.value = wallet
  detailDialog.value = true
}

function openReport(wallet) {
  router.push({ name: 'FinancierReports', query: { walletId: wallet.id } })
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
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
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

.wallet-card {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.07);
  background: #fff;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
  }
}

.wallet-off {
  opacity: 0.62;
}

.wallet-head {
  padding: 14px 16px 12px;
  color: #fff;

  &.head-blue { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
  &.head-orange, &.head-deep-orange { background: linear-gradient(135deg, #c2410c, #fb923c); }
  &.head-green { background: linear-gradient(135deg, #15803d, #34d399); }
  &.head-grey { background: linear-gradient(135deg, #334155, #64748b); }
  &.head-purple { background: linear-gradient(135deg, #6d28d9, #a78bfa); }
  &.head-teal { background: linear-gradient(135deg, #0f766e, #2dd4bf); }
  &.head-brown { background: linear-gradient(135deg, #78350f, #b45309); }
  &.head-pink { background: linear-gradient(135deg, #be185d, #f472b6); }
  &.head-cyan { background: linear-gradient(135deg, #0e7490, #22d3ee); }
}

.wallet-head-sub {
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.wallet-menu {
  color: rgba(255, 255, 255, 0.85);
}

.kpi-label {
  font-size: 10px;
  color: $grey-6;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kpi-value {
  font-size: 14px;
  font-weight: 700;
}

.kpi-mini {
  font-size: 12px;
  font-weight: 600;
}

.dialog-xl { width: 720px; max-width: 95vw; border-radius: 18px; }
.dialog-lg { width: 620px; max-width: 95vw; border-radius: 18px; }
.dialog-md { width: 460px; max-width: 95vw; border-radius: 18px; }

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}

body.body--dark {
  .wallet-card { background: $gray-800; border-color: $gray-700; }
  .glass-tile { background: rgba(30, 41, 59, 0.7); border-color: rgba(255, 255, 255, 0.06); }
}
</style>
