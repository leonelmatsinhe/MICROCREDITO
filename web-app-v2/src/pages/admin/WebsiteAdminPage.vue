<template>
  <q-page class="q-pa-lg website-admin-page">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="row items-center q-gutter-sm">
          <q-icon name="language" size="28px" color="primary" />
          <h1 class="text-h5 text-weight-bold q-my-none">Website Institucional Dinâmico</h1>
        </div>
        <p class="text-caption text-grey-7 q-mt-xs q-mb-none">
          Faça a gestão completa de conteúdos, produtos, taxas, depoimentos, FAQs e leads do website Clack Microcrédito.
        </p>
      </div>

      <div class="row q-gutter-sm items-center">
        <q-btn
          outline
          color="primary"
          icon="open_in_new"
          label="Visualizar Website"
          href="/"
          target="_blank"
          no-caps
        />
        <q-btn
          unelevated
          color="positive"
          icon="save"
          label="Salvar Alterações Gerais"
          :loading="savingConfig"
          no-caps
          @click="saveConfig"
        />
      </div>
    </div>

    <!-- Banner Informativo -->
    <q-banner rounded class="bg-blue-1 text-primary q-mb-md">
      <template v-slot:avatar>
        <q-icon name="info" color="primary" />
      </template>
      Todas as alterações feitas nesta secção são salvas no banco de dados e refletem imediatamente no website público
      (<strong>clackmicrocredito.com</strong> e rota <strong>/</strong>), sem necessidade de reiniciar o servidor ou tocar em código.
    </q-banner>

    <!-- Tabs de Navegação -->
    <q-card flat bordered class="q-mb-md">
      <q-tabs
        v-model="activeTab"
        dense
        align="left"
        class="text-grey-8"
        active-color="primary"
        indicator-color="primary"
        narrow-indicator
      >
        <q-tab name="hero" icon="view_headline" label="Hero & Estatísticas" />
        <q-tab name="produtos" icon="paid" label="Produtos de Crédito" :badge="String(products.length)" />
        <q-tab name="sobre" icon="corporate_fare" label="Sobre Nós & Contactos" />
        <q-tab name="depoimentos" icon="reviews" label="Depoimentos" :badge="String(testimonials.length)" />
        <q-tab name="faqs" icon="help_outline" label="FAQ (Perguntas)" :badge="String(faqs.length)" />
        <q-tab name="leads" icon="assignment_ind" label="Pedidos & Leads" :badge="leadsCountBadge" />
      </q-tabs>
    </q-card>

    <!-- Conteúdo das Tabs -->
    <q-tab-panels v-model="activeTab" animated class="bg-transparent">
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 1: HERO & ESTATÍSTICAS                                   -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="hero" class="q-pa-none">
        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            Secção Hero (Topo do Website)
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="config.heroBadge"
                label="Badge Superior do Hero"
                outlined
                dense
                placeholder="Ex: Instituição de Microcrédito Autorizada"
              />
            </div>
            <div class="col-12 col-md-8">
              <q-input
                v-model="config.heroTitle"
                label="Título Principal (Hero Title) *"
                outlined
                dense
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="config.heroSubtitle"
                label="Subtítulo Descritivo *"
                outlined
                dense
                type="textarea"
                rows="2"
              />
            </div>

            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="config.heroPrimaryCtaText"
                label="Texto do Botão Primário"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="config.heroPrimaryCtaLink"
                label="Link do Botão Primário"
                outlined
                dense
                placeholder="#simulador"
              />
            </div>

            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="config.heroSecondaryCtaText"
                label="Texto do Botão Secundário"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="config.heroSecondaryCtaLink"
                label="Link do Botão Secundário"
                outlined
                dense
                placeholder="Link do WhatsApp"
              />
            </div>
          </div>
        </q-card>

        <!-- Estatísticas de Confiança -->
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            Barra de Indicadores e Estatísticas
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.statClients" label="Número de Clientes" outlined dense />
              <q-input v-model="config.statClientsLabel" label="Rótulo Clientes" outlined dense class="q-mt-sm" />
            </div>

            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.statDisbursed" label="Volume Concedido" outlined dense />
              <q-input v-model="config.statDisbursedLabel" label="Rótulo Volume" outlined dense class="q-mt-sm" />
            </div>

            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.statApproval" label="Tempo de Decisão" outlined dense />
              <q-input v-model="config.statApprovalLabel" label="Rótulo Decisão" outlined dense class="q-mt-sm" />
            </div>

            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.statSatisfaction" label="Taxa de Satisfação" outlined dense />
              <q-input v-model="config.statSatisfactionLabel" label="Rótulo Satisfação" outlined dense class="q-mt-sm" />
            </div>
          </div>
        </q-card>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 2: PRODUTOS DE CRÉDITO                                   -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="produtos" class="q-pa-none">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold text-primary">Modalidades & Linhas de Crédito</div>
              <div class="text-caption text-grey-7">Adicione, edite ou desative produtos exibidos no website e no simulador.</div>
            </div>
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Novo Produto"
              no-caps
              @click="openProductModal()"
            />
          </div>

          <q-table
            flat
            bordered
            :rows="products"
            :columns="productColumns"
            row-key="id"
            :loading="loadingData"
          >
            <template v-slot:body-cell-icon="props">
              <q-td :props="props">
                <q-icon :name="props.row.icon || 'payments'" size="24px" color="primary" />
              </q-td>
            </template>

            <template v-slot:body-cell-limits="props">
              <q-td :props="props">
                <strong>{{ formatMoney(props.row.minAmount) }}</strong> a
                <strong>{{ formatMoney(props.row.maxAmount) }}</strong>
              </q-td>
            </template>

            <template v-slot:body-cell-terms="props">
              <q-td :props="props">
                {{ props.row.minTerm }} a {{ props.row.maxTerm }} meses
              </q-td>
            </template>

            <template v-slot:body-cell-rate="props">
              <q-td :props="props">
                <span class="text-weight-bold text-amber-9">{{ props.row.interestRate }}% a.m.</span>
              </q-td>
            </template>

            <template v-slot:body-cell-featured="props">
              <q-td :props="props">
                <q-badge v-if="props.row.featured" color="amber-8" label="Destaque" />
                <span v-else class="text-grey-5">—</span>
              </q-td>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.row.isActive ? 'positive' : 'grey-6'" :label="props.row.isActive ? 'Ativo' : 'Inativo'" />
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="q-gutter-xs">
                <q-btn flat round dense icon="edit" color="primary" @click="openProductModal(props.row)" />
                <q-btn
                  flat round dense
                  :icon="props.row.isActive ? 'visibility_off' : 'visibility'"
                  :color="props.row.isActive ? 'grey-7' : 'positive'"
                  @click="toggleProductStatus(props.row)"
                >
                  <q-tooltip>{{ props.row.isActive ? 'Desativar' : 'Ativar' }}</q-tooltip>
                </q-btn>
                <q-btn flat round dense icon="delete" color="negative" @click="confirmDeleteProduct(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 3: SOBRE NÓS & CONTACTOS & TAXAS BASE                     -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="sobre" class="q-pa-none">
        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            História, Missão, Visão e Valores
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-input
                v-model="config.aboutHistory"
                label="Quem Somos / História da Clack Microcrédito, EI"
                outlined
                dense
                type="textarea"
                rows="3"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="config.aboutMission"
                label="Missão"
                outlined
                dense
                type="textarea"
                rows="3"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="config.aboutVision"
                label="Visão"
                outlined
                dense
                type="textarea"
                rows="3"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="config.aboutValues"
                label="Valores"
                outlined
                dense
                type="textarea"
                rows="3"
              />
            </div>
          </div>
        </q-card>

        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            Informações de Contacto & Redes Sociais
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.phone" label="Telefone Principal (Vodacom)" outlined dense />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.phoneSecondary" label="Telefone Secundário (Movitel)" outlined dense />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.whatsapp" label="WhatsApp Oficial (com código 258)" outlined dense />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input v-model="config.email" label="Email de Contacto" outlined dense />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="config.address" label="Morada / Localização em Maputo" outlined dense />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="config.workingHours" label="Horário de Atendimento" outlined dense />
            </div>

            <div class="col-12 col-md-4">
              <q-input v-model="config.facebookUrl" label="Link Facebook" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="config.instagramUrl" label="Link Instagram" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="config.linkedinUrl" label="Link LinkedIn" outlined dense />
            </div>
          </div>
        </q-card>

        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            Parâmetros Padrão do Simulador
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model.number="config.defaultInterestRate"
                label="Taxa Base Padrão (% ao mês)"
                outlined
                dense
                type="number"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model.number="config.minAmount"
                label="Montante Mínimo Global (MZN)"
                outlined
                dense
                type="number"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model.number="config.maxAmount"
                label="Montante Máximo Global (MZN)"
                outlined
                dense
                type="number"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model.number="config.maxTerm"
                label="Prazo Máximo Global (Meses)"
                outlined
                dense
                type="number"
              />
            </div>
          </div>
        </q-card>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 4: DEPOIMENTOS                                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="depoimentos" class="q-pa-none">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold text-primary">Depoimentos de Clientes</div>
              <div class="text-caption text-grey-7">Faça a gestão dos testemunhos reais apresentados no website.</div>
            </div>
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Novo Depoimento"
              no-caps
              @click="openTestimonialModal()"
            />
          </div>

          <q-table
            flat
            bordered
            :rows="testimonials"
            :columns="testimonialColumns"
            row-key="id"
            :loading="loadingData"
          >
            <template v-slot:body-cell-rating="props">
              <q-td :props="props">
                <q-icon
                  v-for="s in props.row.rating"
                  :key="s"
                  name="star"
                  size="16px"
                  color="amber-6"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.row.isActive ? 'positive' : 'grey-6'" :label="props.row.isActive ? 'Ativo' : 'Inativo'" />
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="q-gutter-xs">
                <q-btn flat round dense icon="edit" color="primary" @click="openTestimonialModal(props.row)" />
                <q-btn flat round dense icon="delete" color="negative" @click="confirmDeleteTestimonial(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 5: FAQS (PERGUNTAS FREQUENTES)                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="faqs" class="q-pa-none">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold text-primary">Perguntas Frequentes (FAQ)</div>
              <div class="text-caption text-grey-7">Respostas às dúvidas mais comuns sobre crédito, taxas e requisitos.</div>
            </div>
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Nova Pergunta"
              no-caps
              @click="openFaqModal()"
            />
          </div>

          <q-table
            flat
            bordered
            :rows="faqs"
            :columns="faqColumns"
            row-key="id"
            :loading="loadingData"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.row.isActive ? 'positive' : 'grey-6'" :label="props.row.isActive ? 'Ativo' : 'Inativo'" />
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="q-gutter-xs">
                <q-btn flat round dense icon="edit" color="primary" @click="openFaqModal(props.row)" />
                <q-btn flat round dense icon="delete" color="negative" @click="confirmDeleteFaq(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TAB 6: LEADS & PEDIDOS DO WEBSITE                            -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="leads" class="q-pa-none">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold text-primary">Pedidos de Crédito e Contactos do Site</div>
              <div class="text-caption text-grey-7">Propostas recebidas através do formulário e do simulador online.</div>
            </div>

            <div class="row q-gutter-sm items-center">
              <q-select
                v-model="leadFilterStatus"
                :options="['TODOS', 'NOVO', 'EM_CONTACTO', 'CONVERTIDO', 'ARQUIVADO']"
                dense
                outlined
                label="Filtrar Estado"
                style="min-width: 150px"
                @update:model-value="fetchLeads"
              />
              <q-btn flat round dense icon="refresh" color="primary" @click="fetchLeads" />
            </div>
          </div>

          <q-table
            flat
            bordered
            :rows="leads"
            :columns="leadColumns"
            row-key="id"
            :loading="loadingLeads"
          >
            <template v-slot:body-cell-date="props">
              <q-td :props="props">
                {{ formatDate(props.row.createdAt) }}
              </q-td>
            </template>

            <template v-slot:body-cell-phone="props">
              <q-td :props="props">
                <div class="row items-center q-gutter-xs">
                  <span>{{ props.row.phone }}</span>
                  <q-btn
                    flat
                    round
                    dense
                    size="xs"
                    color="positive"
                    icon="chat"
                    :href="`https://wa.me/${cleanPhone(props.row.phone)}`"
                    target="_blank"
                  >
                    <q-tooltip>Conversar no WhatsApp</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-amount="props">
              <q-td :props="props">
                <span v-if="props.row.amount" class="text-weight-bold text-dark">
                  {{ formatMoney(props.row.amount) }}
                </span>
                <span v-else class="text-grey-5">—</span>
              </q-td>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  dense
                  :color="getLeadStatusColor(props.row.status)"
                  text-color="white"
                  size="sm"
                >
                  {{ props.row.status }}
                </q-chip>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="q-gutter-xs">
                <q-btn flat round dense icon="visibility" color="primary" @click="openLeadDetailModal(props.row)">
                  <q-tooltip>Ver Detalhes / Alterar Estado</q-tooltip>
                </q-btn>
                <q-btn flat round dense icon="delete" color="negative" @click="confirmDeleteLead(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- MODAL DE PRODUTO                                             -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <q-dialog v-model="productModalOpen">
      <q-card style="min-width: 600px; max-width: 90vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ editingProduct?.id ? 'Editar Produto de Crédito' : 'Novo Produto de Crédito' }}
          </div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit.prevent="saveProduct" class="column q-gutter-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-8">
                <q-input v-model="editingProduct.title" label="Nome do Produto *" outlined dense required />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model="editingProduct.badge" label="Badge / Etiqueta" outlined dense placeholder="Ex: Mais Procurado" />
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="editingProduct.slug" label="Slug Identificador *" outlined dense required />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="editingProduct.icon" label="Ícone Material" outlined dense placeholder="Ex: storefront, badge" />
              </div>
            </div>

            <q-input
              v-model="editingProduct.summary"
              label="Resumo Curto *"
              outlined
              dense
              type="textarea"
              rows="2"
              required
            />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model.number="editingProduct.minAmount" label="Montante Mínimo (MZN)" outlined dense type="number" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model.number="editingProduct.maxAmount" label="Montante Máximo (MZN)" outlined dense type="number" />
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <q-input v-model.number="editingProduct.minTerm" label="Prazo Mínimo (Meses)" outlined dense type="number" />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model.number="editingProduct.maxTerm" label="Prazo Máximo (Meses)" outlined dense type="number" />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model.number="editingProduct.interestRate" label="Taxa Mensal (% a.m.)" outlined dense type="number" />
              </div>
            </div>

            <q-input
              v-model="editingProduct.requirements"
              label="Requisitos (um por linha)"
              outlined
              dense
              type="textarea"
              rows="3"
            />

            <q-input
              v-model="editingProduct.benefits"
              label="Benefícios (um por linha)"
              outlined
              dense
              type="textarea"
              rows="3"
            />

            <div class="row items-center q-gutter-md">
              <q-toggle v-model="editingProduct.featured" label="Produto em Destaque" color="amber-8" />
              <q-toggle v-model="editingProduct.isActive" label="Ativo no Website" color="positive" />
            </div>

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn type="submit" unelevated color="primary" label="Salvar Produto" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- MODAL DE DEPOIMENTO                                          -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <q-dialog v-model="testimonialModalOpen">
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ editingTestimonial?.id ? 'Editar Depoimento' : 'Novo Depoimento' }}
          </div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit.prevent="saveTestimonial" class="column q-gutter-md">
            <q-input v-model="editingTestimonial.clientName" label="Nome do Cliente *" outlined dense required />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="editingTestimonial.clientRole" label="Cargo / Ocupação *" outlined dense required />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="editingTestimonial.clientLocation" label="Localização (Ex: Maputo)" outlined dense />
              </div>
            </div>

            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-sm-6">
                <q-input v-model="editingTestimonial.productType" label="Modalidade Utilizada" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-8 q-mb-xs">Classificação (Estrelas):</div>
                <q-rating v-model="editingTestimonial.rating" size="24px" color="amber-6" icon="star_border" icon-selected="star" />
              </div>
            </div>

            <q-input
              v-model="editingTestimonial.comment"
              label="Comentário do Cliente *"
              outlined
              dense
              type="textarea"
              rows="3"
              required
            />

            <q-toggle v-model="editingTestimonial.isActive" label="Ativo no Website" color="positive" />

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn type="submit" unelevated color="primary" label="Salvar Depoimento" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- MODAL DE FAQ                                                 -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <q-dialog v-model="faqModalOpen">
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ editingFaq?.id ? 'Editar Pergunta Frequente' : 'Nova Pergunta Frequente' }}
          </div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit.prevent="saveFaq" class="column q-gutter-md">
            <q-input v-model="editingFaq.category" label="Categoria *" outlined dense required />
            <q-input v-model="editingFaq.question" label="Pergunta *" outlined dense required />
            <q-input
              v-model="editingFaq.answer"
              label="Resposta Explicativa *"
              outlined
              dense
              type="textarea"
              rows="4"
              required
            />
            <q-toggle v-model="editingFaq.isActive" label="Ativo no Website" color="positive" />

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn type="submit" unelevated color="primary" label="Salvar Pergunta" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- MODAL DE DETALHES DO LEAD                                    -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <q-dialog v-model="leadDetailModalOpen">
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">Detalhes do Pedido de Crédito</div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedLead" class="q-pt-none">
          <div class="q-pa-md bg-grey-1 rounded-borders q-mb-md">
            <div class="text-h6 text-primary">{{ selectedLead.name }}</div>
            <div class="text-caption text-grey-7">
              {{ selectedLead.city || 'Maputo' }} • Submetido em {{ formatDate(selectedLead.createdAt) }}
            </div>

            <q-separator class="q-my-sm" />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <span class="text-grey-6 text-caption">Telefone:</span>
                <div class="text-weight-bold">{{ selectedLead.phone }}</div>
              </div>
              <div class="col-6">
                <span class="text-grey-6 text-caption">Email:</span>
                <div>{{ selectedLead.email || 'Não informado' }}</div>
              </div>
              <div class="col-6">
                <span class="text-grey-6 text-caption">Montante Solicitado:</span>
                <div class="text-weight-bold text-amber-9">{{ formatMoney(selectedLead.amount) }}</div>
              </div>
              <div class="col-6">
                <span class="text-grey-6 text-caption">Prazo Solicitado:</span>
                <div>{{ selectedLead.term ? selectedLead.term + ' Meses' : 'Não informado' }}</div>
              </div>
            </div>

            <div class="q-mt-md">
              <span class="text-grey-6 text-caption">Mensagem / Observação do Cliente:</span>
              <p class="text-body2 text-grey-9 q-mt-xs">{{ selectedLead.message || 'Sem mensagem adicional.' }}</p>
            </div>
          </div>

          <div class="column q-gutter-sm">
            <q-select
              v-model="selectedLead.status"
              :options="['NOVO', 'EM_CONTACTO', 'CONVERTIDO', 'ARQUIVADO']"
              outlined
              dense
              label="Estado do Lead"
            />

            <q-input
              v-model="selectedLead.notes"
              outlined
              dense
              type="textarea"
              rows="3"
              label="Notas Internas de Acompanhamento (Visível apenas pela equipa)"
            />

            <div class="row justify-between items-center q-mt-md">
              <q-btn
                outline
                color="positive"
                icon="chat"
                label="Abrir WhatsApp do Cliente"
                :href="`https://wa.me/${cleanPhone(selectedLead.phone)}`"
                target="_blank"
                no-caps
              />
              <q-btn
                unelevated
                color="primary"
                label="Atualizar Lead"
                no-caps
                @click="updateLeadStatus"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const activeTab = ref('hero')
const loadingData = ref(false)
const savingConfig = ref(false)
const loadingLeads = ref(false)

// Dados do Website
const config = ref({})
const products = ref([])
const testimonials = ref([])
const faqs = ref([])
const leads = ref([])
const leadFilterStatus = ref('TODOS')

// Modais
const productModalOpen = ref(false)
const editingProduct = ref({})

const testimonialModalOpen = ref(false)
const editingTestimonial = ref({})

const faqModalOpen = ref(false)
const editingFaq = ref({})

const leadDetailModalOpen = ref(false)
const selectedLead = ref(null)

const cleanPhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

const formatMoney = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0,00 MZN'
  return Number(val).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('pt-MZ')
}

const getLeadStatusColor = (status) => {
  const map = {
    NOVO: 'blue-7',
    EM_CONTACTO: 'amber-8',
    CONVERTIDO: 'positive',
    ARQUIVADO: 'grey-7'
  }
  return map[status] || 'grey'
}

const leadsCountBadge = computed(() => {
  const newOnes = leads.value.filter(l => l.status === 'NOVO').length
  return newOnes > 0 ? `${newOnes} novos` : String(leads.value.length)
})

// Colunas das Tabelas
const productColumns = [
  { name: 'icon', label: 'Ícone', field: 'icon', align: 'center' },
  { name: 'title', label: 'Nome do Produto', field: 'title', align: 'left', sortable: true },
  { name: 'limits', label: 'Limites (MZN)', align: 'left' },
  { name: 'terms', label: 'Prazos', align: 'left' },
  { name: 'rate', label: 'Taxa Mensal', align: 'center' },
  { name: 'featured', label: 'Destaque', align: 'center' },
  { name: 'status', label: 'Estado', align: 'center' },
  { name: 'actions', label: 'Ações', align: 'right' }
]

const testimonialColumns = [
  { name: 'clientName', label: 'Cliente', field: 'clientName', align: 'left', sortable: true },
  { name: 'clientRole', label: 'Cargo / Negócio', field: 'clientRole', align: 'left' },
  { name: 'clientLocation', label: 'Local', field: 'clientLocation', align: 'left' },
  { name: 'rating', label: 'Estrelas', align: 'center' },
  { name: 'productType', label: 'Modalidade', field: 'productType', align: 'left' },
  { name: 'status', label: 'Estado', align: 'center' },
  { name: 'actions', label: 'Ações', align: 'right' }
]

const faqColumns = [
  { name: 'category', label: 'Categoria', field: 'category', align: 'left', sortable: true },
  { name: 'question', label: 'Pergunta', field: 'question', align: 'left' },
  { name: 'status', label: 'Estado', align: 'center' },
  { name: 'actions', label: 'Ações', align: 'right' }
]

const leadColumns = [
  { name: 'date', label: 'Data', align: 'left', sortable: true },
  { name: 'name', label: 'Nome do Solicitante', field: 'name', align: 'left', sortable: true },
  { name: 'phone', label: 'Contacto (WhatsApp)', align: 'left' },
  { name: 'city', label: 'Cidade', field: 'city', align: 'left' },
  { name: 'amount', label: 'Montante', align: 'right', sortable: true },
  { name: 'status', label: 'Estado', align: 'center' },
  { name: 'actions', label: 'Ações', align: 'right' }
]

// Carregamento Inicial
const loadAdminData = async () => {
  loadingData.value = true
  try {
    const res = await axios.get('/api/admin/site/content')
    if (res.data.success) {
      config.value = res.data.config || {}
      products.value = res.data.products || []
      testimonials.value = res.data.testimonials || []
      faqs.value = res.data.faqs || []
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar configurações do site.' })
  } finally {
    loadingData.value = false
  }
}

const fetchLeads = async () => {
  loadingLeads.value = true
  try {
    const res = await axios.get('/api/admin/site/leads', {
      params: { status: leadFilterStatus.value }
    })
    if (res.data.success) {
      leads.value = res.data.leads || []
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar leads do site.' })
  } finally {
    loadingLeads.value = false
  }
}

// Salvar Configurações Gerais
const saveConfig = async () => {
  savingConfig.value = true
  try {
    const res = await axios.put('/api/admin/site/config', config.value)
    if (res.data.success) {
      $q.notify({ type: 'positive', message: 'Configurações do website atualizadas com sucesso!' })
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar alterações.' })
  } finally {
    savingConfig.value = false
  }
}

// ── CRUD PRODUTOS ──
const openProductModal = (prod = null) => {
  if (prod) {
    editingProduct.value = { ...prod }
  } else {
    editingProduct.value = {
      title: '',
      slug: '',
      badge: '',
      summary: '',
      minAmount: 1000,
      maxAmount: 100000,
      minTerm: 1,
      maxTerm: 6,
      interestRate: 15.0,
      requirements: '',
      benefits: '',
      icon: 'payments',
      featured: false,
      isActive: true
    }
  }
  productModalOpen.value = true
}

const saveProduct = async () => {
  try {
    if (editingProduct.value.id) {
      await axios.put(`/api/admin/site/products/${editingProduct.value.id}`, editingProduct.value)
      $q.notify({ type: 'positive', message: 'Produto atualizado!' })
    } else {
      await axios.post('/api/admin/site/products', editingProduct.value)
      $q.notify({ type: 'positive', message: 'Produto criado!' })
    }
    productModalOpen.value = false
    loadAdminData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar produto.' })
  }
}

const toggleProductStatus = async (prod) => {
  try {
    await axios.put(`/api/admin/site/products/${prod.id}`, { isActive: !prod.isActive })
    prod.isActive = !prod.isActive
    $q.notify({ type: 'positive', message: 'Estado do produto atualizado!' })
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao alterar estado.' })
  }
}

const confirmDeleteProduct = (prod) => {
  $q.dialog({
    title: 'Eliminar Produto',
    message: `Tem certeza que deseja eliminar o produto "${prod.title}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await axios.delete(`/api/admin/site/products/${prod.id}`)
      $q.notify({ type: 'positive', message: 'Produto eliminado!' })
      loadAdminData()
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar produto.' })
    }
  })
}

// ── CRUD DEPOIMENTOS ──
const openTestimonialModal = (t = null) => {
  if (t) {
    editingTestimonial.value = { ...t }
  } else {
    editingTestimonial.value = {
      clientName: '',
      clientRole: '',
      clientLocation: 'Maputo',
      rating: 5,
      comment: '',
      productType: 'Crédito Negócio',
      isActive: true
    }
  }
  testimonialModalOpen.value = true
}

const saveTestimonial = async () => {
  try {
    if (editingTestimonial.value.id) {
      await axios.put(`/api/admin/site/testimonials/${editingTestimonial.value.id}`, editingTestimonial.value)
      $q.notify({ type: 'positive', message: 'Depoimento atualizado!' })
    } else {
      await axios.post('/api/admin/site/testimonials', editingTestimonial.value)
      $q.notify({ type: 'positive', message: 'Depoimento criado!' })
    }
    testimonialModalOpen.value = false
    loadAdminData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar depoimento.' })
  }
}

const confirmDeleteTestimonial = (t) => {
  $q.dialog({
    title: 'Eliminar Depoimento',
    message: `Tem certeza que deseja eliminar o depoimento de "${t.clientName}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await axios.delete(`/api/admin/site/testimonials/${t.id}`)
      $q.notify({ type: 'positive', message: 'Depoimento eliminado!' })
      loadAdminData()
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar depoimento.' })
    }
  })
}

// ── CRUD FAQS ──
const openFaqModal = (faq = null) => {
  if (faq) {
    editingFaq.value = { ...faq }
  } else {
    editingFaq.value = {
      category: 'Geral',
      question: '',
      answer: '',
      isActive: true
    }
  }
  faqModalOpen.value = true
}

const saveFaq = async () => {
  try {
    if (editingFaq.value.id) {
      await axios.put(`/api/admin/site/faqs/${editingFaq.value.id}`, editingFaq.value)
      $q.notify({ type: 'positive', message: 'FAQ atualizada!' })
    } else {
      await axios.post('/api/admin/site/faqs', editingFaq.value)
      $q.notify({ type: 'positive', message: 'FAQ criada!' })
    }
    faqModalOpen.value = false
    loadAdminData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar FAQ.' })
  }
}

const confirmDeleteFaq = (faq) => {
  $q.dialog({
    title: 'Eliminar Pergunta',
    message: `Deseja eliminar esta pergunta?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await axios.delete(`/api/admin/site/faqs/${faq.id}`)
      $q.notify({ type: 'positive', message: 'Pergunta eliminada!' })
      loadAdminData()
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar FAQ.' })
    }
  })
}

// ── LEADS ──
const openLeadDetailModal = (lead) => {
  selectedLead.value = { ...lead }
  leadDetailModalOpen.value = true
}

const updateLeadStatus = async () => {
  try {
    await axios.put(`/api/admin/site/leads/${selectedLead.value.id}`, {
      status: selectedLead.value.status,
      notes: selectedLead.value.notes
    })
    $q.notify({ type: 'positive', message: 'Lead atualizado com sucesso!' })
    leadDetailModalOpen.value = false
    fetchLeads()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao atualizar lead.' })
  }
}

const confirmDeleteLead = (lead) => {
  $q.dialog({
    title: 'Eliminar Pedido',
    message: `Deseja apagar este pedido de "${lead.name}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await axios.delete(`/api/admin/site/leads/${lead.id}`)
      $q.notify({ type: 'positive', message: 'Lead eliminado!' })
      fetchLeads()
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar lead.' })
    }
  })
}

onMounted(() => {
  loadAdminData()
  fetchLeads()
})
</script>

<style scoped>
.website-admin-page {
  background-color: #f8fafc;
}
</style>
