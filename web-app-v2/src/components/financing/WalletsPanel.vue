<template>
  <div>
    <!-- ═══════ CABEÇALHO EXECUTIVO & FERRAMENTAS ═══════ -->
    <div class="row items-center justify-between q-col-gutter-sm q-mb-md" data-tour="financing-wallets">
      <div class="col-12 col-md">
        <div class="row items-center no-wrap">
          <div class="panel-icon q-mr-sm">
            <q-icon name="account_balance_wallet" size="20px" color="primary" />
          </div>
          <div>
            <div class="text-subtitle1 text-weight-bold text-slate-900">Carteiras de Financiamento</div>
            <div class="text-caption text-grey-7">
              Segregação analítica de fundos e parceiros. Saldo real nas contas de desembolso:
              <strong class="text-slate-900 font-mono">{{ money(saldoRealDisponivel) }}</strong> disponível.
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-auto row items-center q-gutter-xs no-wrap" data-tour="financing-actions">
        <!-- Toggle Modo de Visualização (Cartões vs Planilha) -->
        <q-btn-toggle
          v-model="viewMode"
          dense
          rounded
          unelevated
          toggle-color="primary"
          color="grey-2"
          text-color="grey-8"
          size="sm"
          class="q-mr-xs"
          :options="[
            { icon: 'grid_view', value: 'cards', slot: 'cards' },
            { icon: 'table_chart', value: 'table', slot: 'table' }
          ]"
        >
          <template v-slot:cards>
            <q-tooltip>Vista em Cartões</q-tooltip>
          </template>
          <template v-slot:table>
            <q-tooltip>Vista em Planilha Comparativa</q-tooltip>
          </template>
        </q-btn-toggle>

        <q-btn
          color="primary"
          unelevated
          no-caps
          rounded
          size="sm"
          icon="add"
          label="Nova Carteira"
          class="q-px-sm"
          @click="openForm()"
        />

        <q-btn
          outline
          color="primary"
          no-caps
          rounded
          size="sm"
          icon="link"
          class="q-px-sm"
          :label="unclassifiedCount > 0 ? `Classificar pendentes (${unclassifiedCount})` : 'Classificar créditos'"
          @click="classifyDialog = true"
        >
          <q-tooltip>
            Classificar créditos antigos para associação ao parceiro e aos relatórios regulamentares.
          </q-tooltip>
        </q-btn>

        <!-- Menu de Opções Avançadas (Remove botão perigoso do topo principal) -->
        <q-btn flat round dense size="sm" icon="more_vert" color="grey-7">
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 220px">
              <q-item clickable v-close-popup @click="load">
                <q-item-section avatar><q-icon name="refresh" size="16px" /></q-item-section>
                <q-item-section style="font-size: 13px">Actualizar dados</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="openPurge">
                <q-item-section avatar><q-icon name="cleaning_services" size="16px" color="deep-orange" /></q-item-section>
                <q-item-section style="font-size: 13px" class="text-deep-orange">Limpar carteiras de teste</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>

    <!-- ═══════ CONSOLIDADO EXECUTIVO (4 TILES) ═══════ -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div v-for="tile in consolidated" :key="tile.label" class="col-6 col-md-3">
        <q-card flat bordered class="kpi-summary-card">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between no-wrap">
              <div class="text-caption text-grey-6 text-uppercase text-weight-medium ellipsis">{{ tile.label }}</div>
              <div class="kpi-icon-wrap" :style="{ background: tile.bg }">
                <q-icon :name="tile.icon" size="14px" :color="tile.color" />
              </div>
            </div>
            <div class="text-subtitle1 text-weight-bold font-mono text-slate-900 q-mt-xs">
              {{ tile.value }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════ CARREGAMENTO / VAZIO ═══════ -->
    <div v-if="loading && wallets.length === 0" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar carteiras analíticas...</div>
    </div>

    <q-card v-else-if="wallets.length === 0" flat bordered class="text-center q-pa-xl empty-card">
      <q-icon name="savings" size="56px" color="grey-4" />
      <div class="text-subtitle1 text-grey-7 text-weight-medium q-mt-md">Ainda não existem carteiras de financiamento</div>
      <div class="text-caption text-grey-5 q-mb-md">Cadastre a primeira carteira para segregar o capital alocado por fundo ou parceiro.</div>
      <q-btn color="primary" rounded unelevated no-caps label="Criar primeira carteira" icon="add" @click="openForm()" />
    </q-card>

    <!-- ═══════ VISTA 1: CARTÕES EXECUTIVOS (CARDS) ═══════ -->
    <div v-else-if="viewMode === 'cards'" class="row q-col-gutter-md">
      <div v-for="w in wallets" :key="w.id" class="col-12 col-md-6 col-xl-4">
        <q-card flat bordered class="enterprise-wallet-card" :class="{ 'wallet-inactive': !Number(w.is_ativa) }">
          <!-- Topo do Card: Identificação Institucional -->
          <div class="card-header q-pa-sm">
            <div class="row items-start justify-between no-wrap">
              <div class="col" style="min-width: 0">
                <div class="row items-center q-gutter-x-xs no-wrap q-mb-xs">
                  <span class="code-badge font-mono">{{ w.codigo }}</span>
                  <q-badge
                    v-if="!Number(w.is_ativa)"
                    color="grey-4"
                    text-color="grey-8"
                    label="Inactiva"
                    class="text-weight-bold"
                    style="font-size: 10px"
                  />
                  <q-badge
                    v-if="Number(w.tem_portal)"
                    :color="Number(w.portal_ativo) ? 'teal-1' : 'grey-2'"
                    :text-color="Number(w.portal_ativo) ? 'teal-9' : 'grey-7'"
                    label="Portal Activo"
                    style="font-size: 10px; border: 1px solid rgba(0,0,0,0.06)"
                  />
                  <q-badge
                    v-if="Number(w.is_parceiro_externo)"
                    color="blue-1"
                    text-color="blue-9"
                    label="Parceiro Externo"
                    style="font-size: 10px; border: 1px solid rgba(0,0,0,0.06)"
                  />
                </div>
                <div class="text-subtitle2 text-weight-bold text-slate-900 ellipsis" :title="w.parceiro_nome || w.nome">
                  {{ w.parceiro_nome || w.nome }}
                </div>
                <div class="text-caption text-grey-6 ellipsis" :title="w.nome">
                  {{ w.nome }}
                </div>
              </div>

              <!-- Menu de Acções -->
              <q-btn flat round dense size="sm" icon="more_vert" color="grey-7">
                <q-menu anchor="bottom right" self="top right">
                  <q-list style="min-width: 200px">
                    <q-item clickable v-close-popup @click="openDetail(w)">
                      <q-item-section avatar><q-icon name="insights" size="16px" color="primary" /></q-item-section>
                      <q-item-section style="font-size: 13px">Ver Extracto Completo</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openReport(w)">
                      <q-item-section avatar><q-icon name="assessment" size="16px" color="teal-8" /></q-item-section>
                      <q-item-section style="font-size: 13px">Relatório do Financiador</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openForm(w)">
                      <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar Carteira</q-item-section>
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
          </div>

          <q-separator />

          <q-card-section class="q-pa-sm">
            <!-- BLOCO 1: DISPONIBILIDADE & CAPITAL -->
            <div class="metrics-block q-mb-sm">
              <div class="block-title">Capital & Alocação</div>
              <div class="row q-col-gutter-xs">
                <div class="col-4">
                  <div class="metric-label">Alocado</div>
                  <div class="metric-val font-mono">{{ w.allocated_amount === null ? 'Sem limite' : money(w.allocated_amount) }}</div>
                </div>
                <div class="col-4">
                  <div class="metric-label">Desembolsado</div>
                  <div class="metric-val font-mono text-primary">{{ money(w.disbursed) }}</div>
                </div>
                <div class="col-4">
                  <div class="metric-label">Disponível</div>
                  <div class="metric-val font-mono" :class="availClass(w)">
                    {{ w.saldo_analitico === null ? 'Sem limite' : money(w.saldo_analitico) }}
                  </div>
                </div>
              </div>

              <!-- Barra de Utilização -->
              <div v-if="w.allocated_amount !== null" class="q-mt-xs">
                <div class="row items-center justify-between text-caption text-grey-6" style="font-size: 10px">
                  <span>{{ Math.round((Number(w.utilizacao) || 0) * 100) }}% alocado utilizado</span>
                  <span class="font-mono">{{ money(w.disbursed) }} / {{ money(w.allocated_amount) }}</span>
                </div>
                <q-linear-progress
                  :value="Number(w.utilizacao) || 0"
                  rounded
                  size="5px"
                  class="q-mt-xs"
                  :color="barColor(w)"
                  track-color="grey-2"
                />
              </div>
            </div>

            <!-- BLOCO 2: RECEBIMENTOS & RETORNO -->
            <div class="metrics-block q-mb-sm">
              <div class="block-title">Cobrança & Rendimento</div>
              <div class="row q-col-gutter-xs">
                <div class="col-4">
                  <div class="metric-label">Total Recebido</div>
                  <div class="metric-val font-mono text-positive">{{ money(w.total_recebimentos) }}</div>
                </div>
                <div class="col-4">
                  <div class="metric-label">Juros Recebidos</div>
                  <div class="metric-val font-mono text-positive">{{ money(w.total_juros_recebidos) }}</div>
                </div>
                <div class="col-4">
                  <div class="metric-label">Mora Gerada</div>
                  <div class="metric-val font-mono" :class="Number(w.mora_gerada) > 0 ? 'text-negative' : 'text-grey-7'">
                    {{ money(w.mora_gerada) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- BLOCO 3: QUALIDADE & CARTEIRA ATIVA -->
            <div class="metrics-block">
              <div class="block-title">Posição da Carteira</div>
              <div class="row q-col-gutter-xs">
                <div class="col-4">
                  <div class="metric-label">Créditos</div>
                  <div class="metric-val font-mono">{{ numero(w.num_creditos) }} <span class="text-caption text-grey-5 font-normal">({{ numero(w.num_clientes) }} cli)</span></div>
                </div>
                <div class="col-4">
                  <div class="metric-label">Saldo a Receber</div>
                  <div class="metric-val font-mono text-amber-9">{{ money(w.saldo_a_receber) }}</div>
                </div>
                <div class="col-4">
                  <div class="metric-label">Taxa Média</div>
                  <div class="metric-val font-mono">{{ w.taxa_media === null ? '—' : `${(Number(w.taxa_media) * 100).toFixed(1)}%` }}</div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <div class="card-footer q-px-sm q-py-xs row items-center justify-between text-caption text-grey-6">
            <div>
              {{ numero(w.prestacoes_pagas) }}/{{ numero(w.prestacoes_total) }} prestações
              <span v-if="Number(w.prestacoes_atraso) > 0" class="text-negative text-weight-bold">
                · {{ numero(w.prestacoes_atraso) }} em atraso
              </span>
            </div>
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              color="primary"
              label="Ver Extracto"
              icon-right="chevron_right"
              @click="openDetail(w)"
            />
          </div>
        </q-card>
      </div>
    </div>

    <!-- ═══════ VISTA 2: PLANILHA EXECUTIVA (COMPARATIVA) ═══════ -->
    <q-card v-else flat bordered class="table-card">
      <q-table
        :rows="wallets"
        :columns="tableColumns"
        row-key="id"
        flat
        dense
        separator="horizontal"
        :rows-per-page-options="[15, 25, 50]"
        class="wallets-table"
      >
        <template v-slot:body-cell-codigo="props">
          <q-td :props="props">
            <span class="code-badge font-mono">{{ props.row.codigo }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-nome="props">
          <q-td :props="props">
            <div class="text-weight-bold text-slate-900" style="font-size: 12px">{{ props.row.parceiro_nome || props.row.nome }}</div>
            <div class="text-caption text-grey-6">{{ props.row.nome }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-allocated="props">
          <q-td :props="props" class="font-mono text-right">
            {{ props.row.allocated_amount === null ? 'Sem limite' : money(props.row.allocated_amount) }}
          </q-td>
        </template>

        <template v-slot:body-cell-disbursed="props">
          <q-td :props="props" class="font-mono text-right text-primary text-weight-medium">
            {{ money(props.row.disbursed) }}
          </q-td>
        </template>

        <template v-slot:body-cell-utilizacao="props">
          <q-td :props="props" class="text-center font-mono">
            <span v-if="props.row.allocated_amount !== null">
              {{ Math.round((Number(props.row.utilizacao) || 0) * 100) }}%
            </span>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <template v-slot:body-cell-recebimentos="props">
          <q-td :props="props" class="font-mono text-right text-positive">
            {{ money(props.row.total_recebimentos) }}
          </q-td>
        </template>

        <template v-slot:body-cell-a_receber="props">
          <q-td :props="props" class="font-mono text-right text-amber-9">
            {{ money(props.row.saldo_a_receber) }}
          </q-td>
        </template>

        <template v-slot:body-cell-juros="props">
          <q-td :props="props" class="font-mono text-right">
            {{ money(props.row.total_juros_recebidos) }}
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-badge
              :color="Number(props.row.is_ativa) ? 'teal-1' : 'grey-3'"
              :text-color="Number(props.row.is_ativa) ? 'teal-9' : 'grey-7'"
              :label="Number(props.row.is_ativa) ? 'Activa' : 'Inactiva'"
              style="font-size: 10px; border: 1px solid rgba(0,0,0,0.06)"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center no-wrap">
            <q-btn flat round dense size="sm" icon="insights" color="primary" @click="openDetail(props.row)">
              <q-tooltip>Ver extracto analítico</q-tooltip>
            </q-btn>
            <q-btn flat round dense size="sm" icon="assessment" color="teal-8" @click="openReport(props.row)">
              <q-tooltip>Relatório do financiador</q-tooltip>
            </q-btn>
            <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openForm(props.row)">
              <q-tooltip>Editar carteira</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════ DIALOG: CRIAR/EDITAR ═══════ -->
    <q-dialog v-model="formDialog" persistent>
      <q-card class="dialog-xl">
        <q-card-section class="row items-center bg-slate-900 text-white q-py-sm">
          <q-icon :name="form.id ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">{{ form.id ? 'Editar Carteira de Financiamento' : 'Nova Carteira de Financiamento' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" @click="formDialog = false" />
        </q-card-section>

        <q-card-section class="q-gutter-y-md scroll q-pa-md" style="max-height: 68vh">
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
              <q-select v-model="form.cor_badge" :options="colorOptions" outlined dense emit-value map-options label="Cor temática" />
            </div>
          </div>

          <q-separator />
          <div class="text-subtitle2 text-weight-bold text-slate-800">Parceiro Financiador Externo</div>
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
        <q-separator />
        <q-card-actions align="right" class="q-px-md q-py-sm">
          <q-btn flat no-caps label="Cancelar" :disable="saving" @click="formDialog = false" />
          <q-btn unelevated no-caps color="primary" :label="form.id ? 'Guardar' : 'Criar carteira'" :loading="saving" @click="submitForm" />
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
              <div class="metric-label">{{ dep.label }}</div>
              <div class="text-subtitle2 font-mono text-weight-bold" :class="dep.class">{{ dep.value }}</div>
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
        <q-card-section class="row items-center bg-slate-900 text-white q-py-sm">
          <q-icon name="cleaning_services" size="20px" class="q-mr-sm text-deep-orange" />
          <div class="text-subtitle1 text-weight-bold">Limpeza de Carteiras de Teste</div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" @click="purgeDialog = false" />
        </q-card-section>
        <q-card-section class="q-pa-md">
          <div class="text-caption text-grey-7 q-mb-sm">
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
                  <span class="code-badge font-mono q-mr-sm">{{ candidate.codigo }}</span>
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
            unelevated no-caps color="deep-orange" label="Apagar selecionadas"
            :disable="purgeSelection.length === 0" :loading="saving" @click="confirmPurge"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: DETALHES ═══════ -->
    <q-dialog v-model="detailDialog">
      <q-card class="dialog-lg">
        <q-card-section class="row items-center bg-slate-900 text-white q-py-sm">
          <span class="code-badge font-mono q-mr-sm bg-white text-slate-900">{{ detailWallet?.codigo }}</span>
          <div class="text-subtitle1 text-weight-bold ellipsis">{{ detailWallet?.nome }}</div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" @click="detailDialog = false" />
        </q-card-section>
        <q-card-section class="scroll q-pa-md" style="max-height: 70vh">
          <div class="row q-col-gutter-sm">
            <div v-for="item in detailItems" :key="item.label" class="col-6 col-sm-4">
              <q-card flat bordered class="q-pa-sm" style="border-radius: 8px">
                <div class="metric-label">{{ item.label }}</div>
                <div class="text-subtitle2 font-mono text-weight-bold" :class="item.class">{{ item.value }}</div>
              </q-card>
            </div>
          </div>
          <div v-if="detailWallet?.descricao" class="text-caption text-grey-7 q-mt-md bg-grey-1 q-pa-sm rounded-borders">
            {{ detailWallet.descricao }}
          </div>
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

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const walletsStore = useWalletsStore()

// Modo de visualização: 'cards' ou 'table'
const viewMode = ref('cards')

const formDialog = ref(false)
const deleteDialog = ref(false)
const purgeDialog = ref(false)
const detailDialog = ref(false)
const classifyDialog = ref(false)
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
    label: 'Capital Alocado',
    value: money(summary.value.capital_alocado),
    icon: 'account_balance',
    color: 'primary',
    bg: '#eff6ff'
  },
  {
    label: 'Total Desembolsado',
    value: money(summary.value.total_desembolsado),
    icon: 'arrow_upward',
    color: 'indigo-8',
    bg: '#eef2ff'
  },
  {
    label: 'Total Recebimentos',
    value: money(summary.value.total_recebimentos),
    icon: 'arrow_downward',
    color: 'positive',
    bg: '#ecfdf5'
  },
  {
    label: 'Saldo Real Disponível',
    value: money(saldoRealDisponivel.value),
    icon: 'account_balance_wallet',
    color: 'teal-8',
    bg: '#f0fdfa'
  }
])

const tableColumns = [
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left', sortable: true },
  { name: 'nome', label: 'Carteira / Parceiro', field: 'nome', align: 'left', sortable: true },
  { name: 'allocated', label: 'Alocado', field: 'allocated_amount', align: 'right', sortable: true },
  { name: 'disbursed', label: 'Desembolsado', field: 'disbursed', align: 'right', sortable: true },
  { name: 'utilizacao', label: 'Utilização', field: 'utilizacao', align: 'center', sortable: true },
  { name: 'recebimentos', label: 'Recebido', field: 'total_recebimentos', align: 'right', sortable: true },
  { name: 'a_receber', label: 'A Receber', field: 'saldo_a_receber', align: 'right', sortable: true },
  { name: 'juros', label: 'Juros', field: 'total_juros_recebidos', align: 'right', sortable: true },
  { name: 'status', label: 'Estado', field: 'is_ativa', align: 'center' },
  { name: 'actions', label: 'Acções', field: () => '', align: 'center' }
]

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
    { label: 'Previsão de lucro', value: money(w.previsao_lucro), class: 'text-indigo-8' },
    { label: 'Mora gerada', value: money(w.mora_gerada) },
    { label: 'Mora recebida', value: money(w.total_mora_recebida) },
    { label: 'Saldo a receber', value: money(w.saldo_a_receber), class: 'text-amber-9' },
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
  if (used >= 0.85) return 'amber-9'
  return 'primary'
}

const availClass = (w) => {
  if (w.saldo_analitico === null) return 'text-grey-7'
  return Number(w.saldo_analitico) > 0 ? 'text-positive' : 'text-negative'
}

async function load() {
  try {
    await walletsStore.fetchWallets(authStore.companyId)
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
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.kpi-summary-card {
  border-radius: 10px;
  background: #ffffff;
  border-color: #e2e8f0;
}

.kpi-icon-wrap {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.enterprise-wallet-card {
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    border-color: #cbd5e1;
  }
}

.wallet-inactive {
  opacity: 0.65;
  background: #f8fafc;
}

.card-header {
  background: #fafbfc;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.code-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  font-size: 11px;
  font-weight: 700;
}

.metrics-block {
  background: #f8fafc;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.block-title {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 3px;
}

.metric-label {
  font-size: 10px;
  color: #64748b;
}

.metric-val {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.card-footer {
  background: #ffffff;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.table-card {
  border-radius: 10px;
  background: #ffffff;
  border-color: #e2e8f0;
  overflow: hidden;
}

.wallets-table {
  :deep(.q-table thead th) {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    background-color: #f1f5f9;
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  :deep(.q-table tbody td) {
    font-size: 12px;
    padding: 6px 10px;
    border-color: #f1f5f9;
  }
}

.dialog-xl { width: 720px; max-width: 95vw; border-radius: 14px; }
.dialog-lg { width: 620px; max-width: 95vw; border-radius: 14px; }
.dialog-md { width: 460px; max-width: 95vw; border-radius: 14px; }

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.text-slate-800 { color: #1e293b; }
.text-slate-900 { color: #0f172a; }

body.body--dark {
  .enterprise-wallet-card, .kpi-summary-card, .table-card {
    background: #1e293b;
    border-color: #334155;
  }
  .card-header, .card-footer, .metrics-block {
    background: #0f172a;
  }
  .text-slate-900, .metric-val {
    color: #f8fafc;
  }
  .code-badge {
    background: #334155;
    border-color: #475569;
    color: #f8fafc;
  }
}
</style>
