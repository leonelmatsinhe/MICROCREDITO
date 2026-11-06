<template>
  <div class="clack-website">
    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 1. TOP ANNOUNCEMENT BAR & NAVBAR                              -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <header class="site-header" :class="{ 'scrolled': isScrolled }">
      <!-- Top Bar com contactos rápidos -->
      <div class="top-bar gt-sm">
        <div class="container row items-center justify-between text-caption text-grey-4">
          <div class="row items-center q-gutter-md">
            <span class="row items-center q-gutter-xs">
              <q-icon name="phone" size="14px" color="amber-5" />
              <a :href="`tel:${cleanPhone(config.phone)}`" class="text-white hover-amber">{{ config.phone }}</a>
            </span>
            <span class="row items-center q-gutter-xs">
              <q-icon name="chat" size="14px" color="positive" />
              <a :href="whatsappUrl" target="_blank" class="text-white hover-amber">WhatsApp Oficial</a>
            </span>
            <span class="row items-center q-gutter-xs">
              <q-icon name="email" size="14px" color="amber-5" />
              <span>{{ config.email }}</span>
            </span>
          </div>
          <div class="row items-center q-gutter-sm">
            <span class="text-amber-4 text-weight-medium">
              <q-icon name="verified" size="14px" /> {{ config.heroBadge || 'Instituição de Microcrédito Autorizada' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Main Navigation -->
      <nav class="main-nav">
        <div class="container row items-center justify-between">
          <!-- Logo & Nome Institucional -->
          <a href="#" class="brand-link row items-center no-wrap text-decoration-none">
            <div class="brand-logo-badge">
              <q-icon name="account_balance" size="26px" color="white" />
            </div>
            <div class="brand-info q-ml-sm">
              <span class="brand-title">Clack Microcrédito</span>
              <span class="brand-subtitle">Entidade Individual • Moçambique</span>
            </div>
          </a>

          <!-- Desktop Links -->
          <div class="desktop-links gt-md row items-center q-gutter-md">
            <a href="#inicio" class="nav-item">Início</a>
            <a href="#sobre" class="nav-item">Sobre Nós</a>
            <a href="#produtos" class="nav-item">Produtos</a>
            <a href="#simulador" class="nav-item highlight-link">Simulador</a>
            <a href="#como-funciona" class="nav-item">Como Funciona</a>
            <a href="#requisitos" class="nav-item">Requisitos</a>
            <a href="#depoimentos" class="nav-item">Depoimentos</a>
            <a href="#faq" class="nav-item">FAQ</a>
            <a href="#contacto" class="nav-item">Contacto</a>
          </div>

          <!-- CTAs -->
          <div class="row items-center q-gutter-sm">
            <!-- Botão WhatsApp Rápido -->
            <q-btn
              flat
              dense
              round
              color="positive"
              icon="chat"
              class="gt-xs"
              :href="whatsappUrl"
              target="_blank"
            >
              <q-tooltip>Falar no WhatsApp</q-tooltip>
            </q-btn>

            <!-- Acesso ao Sistema de Gestão -->
            <q-btn
              outline
              color="amber-5"
              text-color="white"
              no-caps
              dense
              class="q-px-md system-login-btn gt-xs"
              :href="systemUrl"
              icon="lock"
              label="Aceder ao Sistema"
            />

            <!-- Mobile Drawer Toggle -->
            <q-btn
              flat
              dense
              round
              color="white"
              icon="menu"
              class="lt-lg"
              @click="mobileDrawer = !mobileDrawer"
            />
          </div>
        </div>
      </nav>
    </header>

    <!-- Mobile Drawer Menu -->
    <q-drawer
      v-model="mobileDrawer"
      side="right"
      overlay
      behavior="mobile"
      class="mobile-menu-drawer bg-navy-dark text-white"
    >
      <div class="q-pa-md column full-height justify-between">
        <div>
          <div class="row items-center justify-between q-mb-lg">
            <div class="row items-center">
              <q-icon name="account_balance" size="22px" color="amber-5" class="q-mr-xs" />
              <span class="text-subtitle1 text-weight-bold">Clack Microcrédito</span>
            </div>
            <q-btn flat round dense icon="close" color="white" @click="mobileDrawer = false" />
          </div>

          <q-list dark separator class="mobile-nav-list">
            <q-item clickable v-ripple @click="navigateTo('#inicio')">
              <q-item-section avatar><q-icon name="home" color="amber-5" /></q-item-section>
              <q-item-section>Início</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#sobre')">
              <q-item-section avatar><q-icon name="corporate_fare" color="amber-5" /></q-item-section>
              <q-item-section>Sobre Nós</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#produtos')">
              <q-item-section avatar><q-icon name="paid" color="amber-5" /></q-item-section>
              <q-item-section>Créditos & Produtos</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#simulador')">
              <q-item-section avatar><q-icon name="calculate" color="amber-5" /></q-item-section>
              <q-item-section class="text-amber-4 text-weight-bold">Simulador de Crédito</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#como-funciona')">
              <q-item-section avatar><q-icon name="checklist_rtl" color="amber-5" /></q-item-section>
              <q-item-section>Como Funciona</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#requisitos')">
              <q-item-section avatar><q-icon name="badge" color="amber-5" /></q-item-section>
              <q-item-section>Requisitos</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#depoimentos')">
              <q-item-section avatar><q-icon name="forum" color="amber-5" /></q-item-section>
              <q-item-section>Depoimentos</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#faq')">
              <q-item-section avatar><q-icon name="help_outline" color="amber-5" /></q-item-section>
              <q-item-section>Perguntas Frequentes</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="navigateTo('#contacto')">
              <q-item-section avatar><q-icon name="contact_phone" color="amber-5" /></q-item-section>
              <q-item-section>Contactos & Agência</q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="q-pt-lg column q-gutter-sm">
          <q-btn
            unelevated
            color="positive"
            text-color="white"
            icon="chat"
            label="WhatsApp Direto"
            class="full-width q-py-sm"
            :href="whatsappUrl"
            target="_blank"
          />
          <q-btn
            outline
            color="amber-5"
            text-color="white"
            icon="lock"
            label="Aceder ao Sistema"
            class="full-width q-py-sm"
            :href="systemUrl"
          />
        </div>
      </div>
    </q-drawer>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 2. HERO SECTION COM SIMULADOR RÁPIDO INTEGRADO               -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="inicio" class="hero-section">
      <div class="hero-bg-overlay"></div>
      <div class="container hero-container">
        <div class="row q-col-gutter-xl items-center">
          <!-- Coluna de Texto e Proposta de Valor -->
          <div class="col-12 col-lg-7">
            <div class="hero-badge animate-fade-in">
              <q-icon name="verified_user" size="18px" class="q-mr-xs text-amber-4" />
              <span>{{ config.heroBadge || 'Instituição de Microcrédito Autorizada' }}</span>
            </div>

            <h1 class="hero-title text-white">
              {{ config.heroTitle || 'Crédito Rápido, Justo e Sem Burocracia em Moçambique' }}
            </h1>

            <p class="hero-subtitle text-grey-3">
              {{ config.heroSubtitle || 'Impulsione o seu negócio ou resolva imprevistos com aprovação em até 24 horas. Desembolso imediato na sua conta bancária ou via M-Pesa com as melhores taxas do mercado.' }}
            </p>

            <div class="hero-actions row items-center q-gutter-md q-mt-md">
              <q-btn
                unelevated
                color="amber-6"
                text-color="dark"
                icon="calculate"
                size="lg"
                class="hero-btn-primary text-weight-bold"
                href="#simulador"
                label="Simular Crédito Agora"
              />
              <q-btn
                outline
                color="white"
                icon="chat"
                size="lg"
                class="hero-btn-secondary"
                :href="whatsappUrl"
                target="_blank"
                label="Falar no WhatsApp"
              />
            </div>

            <!-- Chips de Confiança -->
            <div class="trust-chips row items-center q-gutter-sm q-mt-lg">
              <div class="trust-chip">
                <q-icon name="bolt" color="amber-4" size="16px" />
                <span>Aprovação em até 24h</span>
              </div>
              <div class="trust-chip">
                <q-icon name="smartphone" color="green-4" size="16px" />
                <span>Desembolso via M-Pesa / Banco</span>
              </div>
              <div class="trust-chip">
                <q-icon name="lock_open" color="amber-4" size="16px" />
                <span>Sem hipoteca pesada</span>
              </div>
              <div class="trust-chip">
                <q-icon name="verified" color="amber-4" size="16px" />
                <span>Valores em MZN</span>
              </div>
            </div>
          </div>

          <!-- Coluna com Simulador Rápido Hero Card -->
          <div class="col-12 col-lg-5">
            <div class="simulator-card-hero">
              <div class="card-hero-header">
                <div class="row items-center justify-between">
                  <div>
                    <h3 class="card-hero-title">Simulador Rápido</h3>
                    <p class="card-hero-subtitle">Calcule a sua prestação estimada na hora</p>
                  </div>
                  <q-icon name="calculate" size="32px" color="amber-4" />
                </div>
              </div>

              <div class="card-hero-body q-pa-lg">
                <!-- Seletor de Montante -->
                <div class="sim-group q-mb-md">
                  <div class="row items-center justify-between q-mb-xs">
                    <span class="sim-label">Quanto precisa?</span>
                    <span class="sim-val-display text-amber-4">{{ formatMoney(quickAmount) }}</span>
                  </div>
                  <q-slider
                    v-model="quickAmount"
                    :min="Number(config.minAmount || 1000)"
                    :max="Number(config.maxAmount || 300000)"
                    :step="1000"
                    color="amber-6"
                    track-color="blue-grey-8"
                  />
                  <div class="row justify-between text-caption text-grey-5">
                    <span>{{ formatMoney(config.minAmount || 1000) }}</span>
                    <span>{{ formatMoney(config.maxAmount || 300000) }}</span>
                  </div>
                </div>

                <!-- Seletor de Prazo -->
                <div class="sim-group q-mb-lg">
                  <div class="row items-center justify-between q-mb-xs">
                    <span class="sim-label">Em quantos meses quer pagar?</span>
                    <span class="sim-val-display text-white">{{ quickTerm }} {{ quickTerm === 1 ? 'mês' : 'meses' }}</span>
                  </div>
                  <q-slider
                    v-model="quickTerm"
                    :min="Number(config.minTerm || 1)"
                    :max="Number(config.maxTerm || 12)"
                    :step="1"
                    color="amber-6"
                    track-color="blue-grey-8"
                  />
                  <div class="row justify-between text-caption text-grey-5">
                    <span>1 mês</span>
                    <span>12 meses</span>
                  </div>
                </div>

                <!-- Resumo dos Valores Calculados -->
                <div class="sim-summary-box q-pa-md q-mb-lg">
                  <div class="row justify-between items-center q-mb-xs">
                    <span class="text-grey-4">Prestação Mensal Estimada:</span>
                    <span class="text-h6 text-weight-bolder text-amber-4">{{ formatMoney(quickMonthlyPayment) }}</span>
                  </div>
                  <div class="row justify-between items-center text-caption text-grey-4 q-mb-xs">
                    <span>Total a Reembolsar:</span>
                    <span class="text-white text-weight-medium">{{ formatMoney(quickTotalPayment) }}</span>
                  </div>
                  <div class="row justify-between items-center text-caption text-grey-5">
                    <span>Taxa base mensal indicativa:</span>
                    <span>{{ config.defaultInterestRate || 15 }}% a.m.</span>
                  </div>
                </div>

                <!-- Botões de Ação do Simulador Rápido -->
                <div class="column q-gutter-sm">
                  <q-btn
                    unelevated
                    color="amber-6"
                    text-color="dark"
                    icon="chat"
                    label="Solicitar Este Crédito via WhatsApp"
                    class="full-width q-py-sm text-weight-bold"
                    @click="sendQuickWhatsApp"
                  />
                  <q-btn
                    flat
                    color="grey-4"
                    icon="edit_note"
                    label="Personalizar Simulação Completa"
                    class="full-width"
                    href="#simulador"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 3. TRUST METRICS BAR                                          -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section class="trust-stats-section">
      <div class="container">
        <div class="row q-col-gutter-lg justify-center text-center">
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-number text-amber-5">{{ config.statClients || '+2.500' }}</div>
              <div class="stat-label">{{ config.statClientsLabel || 'Clientes Satisfeitos' }}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-number text-amber-5">{{ config.statDisbursed || '+45M MZN' }}</div>
              <div class="stat-label">{{ config.statDisbursedLabel || 'Crédito Concedido' }}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-number text-amber-5">{{ config.statApproval || '24 Horas' }}</div>
              <div class="stat-label">{{ config.statApprovalLabel || 'Aprovação Rápida' }}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-number text-amber-5">{{ config.statSatisfaction || '98%' }}</div>
              <div class="stat-label">{{ config.statSatisfactionLabel || 'Taxa de Satisfação' }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 4. SOBRE NÓS (HISTÓRIA, MISSÃO, VISÃO, VALORES)              -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="sobre" class="section-padding bg-light">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag">Institucional</span>
          <h2 class="section-title">Sobre a Clack Microcrédito, EI</h2>
          <p class="section-description">
            Comprometidos em construir pontes financeiras sólidas e inclusivas para o crescimento de famílias e empresas em Moçambique.
          </p>
        </div>

        <div class="row q-col-gutter-xl items-center q-mb-xl">
          <div class="col-12 col-md-6">
            <div class="about-text-content">
              <h3 class="about-title">Crédito Responsável, Transparente e Acessível</h3>
              <p class="text-body1 text-grey-8 line-height-relaxed q-mb-md">
                {{ config.aboutHistory || 'A Clack Microcrédito, EI nasceu com o propósito firme de aproximar soluções financeiras reais e ágeis a quem mais necessita de dinamizar os seus negócios ou ultrapassar fases financeiras críticas.' }}
              </p>
              <p class="text-body1 text-grey-8 line-height-relaxed q-mb-lg">
                Eliminamos a burocracia excessiva através de tecnologia acessível, atendimento acolhedor e processos de validação adaptados ao contexto económico de Moçambique.
              </p>
              
              <div class="row q-gutter-md">
                <div class="about-pill">
                  <q-icon name="check_circle" color="positive" size="20px" />
                  <span>Conformidade Legal & Rigor</span>
                </div>
                <div class="about-pill">
                  <q-icon name="check_circle" color="positive" size="20px" />
                  <span>Atendimento Humanizado</span>
                </div>
                <div class="about-pill">
                  <q-icon name="check_circle" color="positive" size="20px" />
                  <span>Sem Custos Ocultos</span>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="about-pillars-grid">
              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-blue-1 text-primary">
                  <q-icon name="flag" size="28px" />
                </div>
                <h4 class="pillar-title">Missão</h4>
                <p class="pillar-text">{{ config.aboutMission || 'Prover soluções de crédito rápido, ético e sustentável que alavanquem o crescimento de negócios e o bem-estar das famílias moçambicanas.' }}</p>
              </div>

              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-amber-1 text-amber-9">
                  <q-icon name="visibility" size="28px" />
                </div>
                <h4 class="pillar-title">Visão</h4>
                <p class="pillar-text">{{ config.aboutVision || 'Ser a instituição de microfinanças digital de referência em Moçambique, reconhecida pela confiança, inovação e excelência de atendimento.' }}</p>
              </div>

              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-teal-1 text-teal-8">
                  <q-icon name="handshake" size="28px" />
                </div>
                <h4 class="pillar-title">Valores</h4>
                <p class="pillar-text">{{ config.aboutValues || 'Transparência total, Rapidez e simplicidade, Respeito ao cliente, Rigor e responsabilidade financeira.' }}</p>
              </div>

              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-indigo-1 text-indigo-8">
                  <q-icon name="security" size="28px" />
                </div>
                <h4 class="pillar-title">Segurança</h4>
                <p class="pillar-text">Proteção rigorosa dos dados e contratos celebrados nos termos da legislação moçambicana em vigor.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 5. PRODUTOS / CRÉDITOS DISPONÍVEIS                           -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="produtos" class="section-padding bg-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag">Soluções Financeiras</span>
          <h2 class="section-title">Créditos Feitos à Medida das Suas Necessidades</h2>
          <p class="section-description">
            Conheça as nossas modalidades com taxas competitivas e planos de pagamento confortáveis.
          </p>
        </div>

        <div class="row q-col-gutter-lg">
          <div
            v-for="prod in products"
            :key="prod.id || prod.slug"
            class="col-12 col-md-6 col-lg-3"
          >
            <div class="product-card" :class="{ 'featured-product': prod.featured }">
              <div v-if="prod.badge" class="product-badge">{{ prod.badge }}</div>

              <div class="product-header">
                <div class="product-icon-wrap">
                  <q-icon :name="prod.icon || 'payments'" size="32px" color="amber-7" />
                </div>
                <h3 class="product-title">{{ prod.title }}</h3>
                <p class="product-summary">{{ prod.summary }}</p>
              </div>

              <div class="product-specs">
                <div class="spec-row">
                  <span class="spec-label">Montante:</span>
                  <span class="spec-value text-primary font-weight-bold">
                    {{ formatMoney(prod.minAmount) }} a {{ formatMoney(prod.maxAmount) }}
                  </span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">Prazo:</span>
                  <span class="spec-value">{{ prod.minTerm }} a {{ prod.maxTerm }} meses</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">Taxa indicativa:</span>
                  <span class="spec-value text-amber-8 font-weight-bold">{{ prod.interestRate }}% a.m.</span>
                </div>
              </div>

              <div class="product-details-accordion q-my-sm">
                <q-expansion-item
                  dense
                  dense-toggle
                  expand-separator
                  header-class="text-caption text-grey-7"
                  label="Ver Requisitos & Benefícios"
                >
                  <div class="q-py-sm text-caption text-grey-8">
                    <div class="text-weight-bold text-dark q-mb-xs">Requisitos:</div>
                    <ul class="q-pl-md q-my-none">
                      <li v-for="(req, ri) in splitLines(prod.requirements)" :key="ri">{{ req }}</li>
                    </ul>

                    <div class="text-weight-bold text-dark q-mt-sm q-mb-xs">Benefícios:</div>
                    <ul class="q-pl-md q-my-none">
                      <li v-for="(ben, bi) in splitLines(prod.benefits)" :key="bi">{{ ben }}</li>
                    </ul>
                  </div>
                </q-expansion-item>
              </div>

              <div class="product-footer q-mt-md">
                <q-btn
                  unelevated
                  color="navy-dark"
                  text-color="white"
                  class="full-width select-prod-btn"
                  label="Simular Este Produto"
                  icon="calculate"
                  @click="selectProductForSimulation(prod)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 6. SIMULADOR COMPLETO INTERATIVO                             -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="simulador" class="section-padding bg-navy-dark text-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag tag-amber">Calculadora Online</span>
          <h2 class="section-title text-white">Simulador Completo de Crédito</h2>
          <p class="section-description text-grey-3">
            Ajuste os valores e veja em tempo real o valor da prestação mensal e o total a reembolsar.
          </p>
        </div>

        <div class="simulator-main-box">
          <div class="row q-col-gutter-xl items-center">
            <!-- Controles do Simulador -->
            <div class="col-12 col-lg-7">
              <!-- Seleção do Produto -->
              <div class="sim-ctrl-group q-mb-lg">
                <label class="sim-ctrl-label">1. Modalidade de Crédito</label>
                <div class="row q-gutter-sm q-mt-xs">
                  <q-btn
                    v-for="p in products"
                    :key="p.id || p.slug"
                    :outline="selectedProduct?.slug !== p.slug"
                    :unelevated="selectedProduct?.slug === p.slug"
                    :color="selectedProduct?.slug === p.slug ? 'amber-6' : 'white'"
                    :text-color="selectedProduct?.slug === p.slug ? 'dark' : 'white'"
                    size="sm"
                    no-caps
                    class="q-px-md text-weight-medium"
                    @click="selectProductForSimulation(p)"
                  >
                    {{ p.title }}
                  </q-btn>
                </div>
              </div>

              <!-- Montante Desejado -->
              <div class="sim-ctrl-group q-mb-xl">
                <div class="row items-center justify-between q-mb-sm">
                  <label class="sim-ctrl-label">2. Montante Pretendido (MZN)</label>
                  <div class="amount-input-box">
                    <span class="currency-tag">MZN</span>
                    <input
                      type="number"
                      v-model.number="simAmount"
                      :min="selectedProduct?.minAmount || 1000"
                      :max="selectedProduct?.maxAmount || 300000"
                      step="1000"
                      class="custom-number-input"
                    />
                  </div>
                </div>

                <q-slider
                  v-model="simAmount"
                  :min="Number(selectedProduct?.minAmount || 1000)"
                  :max="Number(selectedProduct?.maxAmount || 300000)"
                  :step="1000"
                  color="amber-5"
                  track-color="blue-grey-8"
                  thumb-size="24px"
                />
                <div class="row justify-between text-caption text-grey-4">
                  <span>Mínimo: {{ formatMoney(selectedProduct?.minAmount || 1000) }}</span>
                  <span>Máximo: {{ formatMoney(selectedProduct?.maxAmount || 300000) }}</span>
                </div>
              </div>

              <!-- Prazo de Reembolso -->
              <div class="sim-ctrl-group q-mb-lg">
                <div class="row items-center justify-between q-mb-sm">
                  <label class="sim-ctrl-label">3. Prazo de Reembolso</label>
                  <span class="text-h6 text-amber-4 text-weight-bold">
                    {{ simTerm }} {{ simTerm === 1 ? 'Mês' : 'Meses' }}
                  </span>
                </div>

                <q-slider
                  v-model="simTerm"
                  :min="Number(selectedProduct?.minTerm || 1)"
                  :max="Number(selectedProduct?.maxTerm || 12)"
                  :step="1"
                  color="amber-5"
                  track-color="blue-grey-8"
                  thumb-size="24px"
                />
                <div class="row justify-between text-caption text-grey-4">
                  <span>{{ selectedProduct?.minTerm || 1 }} mês</span>
                  <span>{{ selectedProduct?.maxTerm || 12 }} meses</span>
                </div>
              </div>
            </div>

            <!-- Resumo e Detalhes da Proposta -->
            <div class="col-12 col-lg-5">
              <div class="sim-result-card">
                <div class="sim-result-header">
                  <span class="text-caption text-grey-4 uppercase">Resumo da Simulação</span>
                  <h4 class="text-h5 text-weight-bold text-white q-mt-xs q-mb-none">
                    {{ selectedProduct?.title || 'Crédito Clack' }}
                  </h4>
                </div>

                <div class="sim-result-body">
                  <div class="result-highlight-box q-pa-md q-mb-md text-center">
                    <div class="text-caption text-grey-3">Prestação Mensal Estimada</div>
                    <div class="text-h4 text-weight-bolder text-amber-4 q-mt-xs">
                      {{ formatMoney(simMonthlyPayment) }}
                    </div>
                    <div class="text-caption text-grey-4 q-mt-xs">por mês durante {{ simTerm }} {{ simTerm === 1 ? 'mês' : 'meses' }}</div>
                  </div>

                  <div class="sim-specs-list q-mb-lg">
                    <div class="spec-item row justify-between">
                      <span class="text-grey-4">Capital Financiado:</span>
                      <span class="text-white text-weight-medium">{{ formatMoney(simAmount) }}</span>
                    </div>
                    <div class="spec-item row justify-between">
                      <span class="text-grey-4">Taxa de Juros Mensal:</span>
                      <span class="text-amber-4 text-weight-medium">{{ simInterestRate }}% a.m.</span>
                    </div>
                    <div class="spec-item row justify-between">
                      <span class="text-grey-4">Total de Juros:</span>
                      <span class="text-white text-weight-medium">{{ formatMoney(simTotalInterest) }}</span>
                    </div>
                    <q-separator dark class="q-my-sm" />
                    <div class="spec-item row justify-between text-subtitle1">
                      <span class="text-grey-3 font-weight-bold">Total a Reembolsar:</span>
                      <span class="text-white font-weight-bold">{{ formatMoney(simTotalPayment) }}</span>
                    </div>
                  </div>

                  <!-- Botões de Envio de Proposta -->
                  <div class="column q-gutter-sm">
                    <q-btn
                      unelevated
                      color="positive"
                      text-color="white"
                      icon="chat"
                      size="md"
                      label="Solicitar via WhatsApp"
                      class="full-width q-py-sm text-weight-bold"
                      @click="sendFullWhatsApp"
                    />

                    <q-btn
                      unelevated
                      color="amber-6"
                      text-color="dark"
                      icon="assignment"
                      size="md"
                      label="Pedir Proposta Online"
                      class="full-width q-py-sm text-weight-bold"
                      @click="openLeadModal"
                    />
                  </div>

                  <p class="text-caption text-grey-4 text-center q-mt-md q-mb-none">
                    * Simulação indicativa sem compromisso. Sujeito à análise documental.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 7. COMO FUNCIONA (3 PASSOS SIMPLES)                          -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="como-funciona" class="section-padding bg-light">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag">Processo Simplificado</span>
          <h2 class="section-title">Como Obter o Seu Crédito em 3 Passos</h2>
          <p class="section-description">
            Criamos uma jornada 100% prática e desprovida de burocracias desnecessárias.
          </p>
        </div>

        <div class="row q-col-gutter-xl text-center">
          <!-- Passo 1 -->
          <div class="col-12 col-md-4">
            <div class="step-card">
              <div class="step-number-bubble">1</div>
              <div class="step-icon-box bg-blue-1 text-primary">
                <q-icon name="smartphone" size="36px" />
              </div>
              <h3 class="step-title">Simula e Solicita</h3>
              <p class="step-text">
                Escolha o montante e prazo no nosso simulador e submeta a sua proposta pelo site ou via WhatsApp com rapidez.
              </p>
            </div>
          </div>

          <!-- Passo 2 -->
          <div class="col-12 col-md-4">
            <div class="step-card">
              <div class="step-number-bubble">2</div>
              <div class="step-icon-box bg-amber-1 text-amber-9">
                <q-icon name="assignment_turned_in" size="36px" />
              </div>
              <h3 class="step-title">Envia Documentos</h3>
              <p class="step-text">
                Fotografe o seu BI, NUIT e comprovativo de renda ou negócio. A nossa equipa analisa em menos de 24 horas.
              </p>
            </div>
          </div>

          <!-- Passo 3 -->
          <div class="col-12 col-md-4">
            <div class="step-card">
              <div class="step-number-bubble">3</div>
              <div class="step-icon-box bg-green-1 text-positive">
                <q-icon name="account_balance_wallet" size="36px" />
              </div>
              <h3 class="step-title">Recebe o Dinheiro</h3>
              <p class="step-text">
                Após aprovação e assinatura simplificada, o valor é creditado imediatamente via M-Pesa ou transferência bancária.
              </p>
            </div>
          </div>
        </div>

        <div class="text-center q-mt-xl">
          <q-btn
            unelevated
            color="amber-6"
            text-color="dark"
            icon="chat"
            size="lg"
            label="Começar Pedido Agora pelo WhatsApp"
            class="text-weight-bold"
            :href="whatsappUrl"
            target="_blank"
          />
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 8. REQUISITOS NECESSÁRIOS                                     -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="requisitos" class="section-padding bg-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag">Documentação</span>
          <h2 class="section-title">Requisitos Gerais para Pedido de Crédito</h2>
          <p class="section-description">
            Prepare previamente os seus documentos para que a aprovação seja o mais célere possível.
          </p>
        </div>

        <div class="row q-col-gutter-lg justify-center">
          <div class="col-12 col-sm-6 col-md-3">
            <div class="req-box shadow-1">
              <q-icon name="badge" size="36px" color="primary" class="q-mb-sm" />
              <h4 class="req-title">Identificação Válida</h4>
              <p class="req-text">BI Moçambicano, DIRE (para residentes estrangeiros) ou Passaporte válido.</p>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <div class="req-box shadow-1">
              <q-icon name="pin" size="36px" color="amber-8" class="q-mb-sm" />
              <h4 class="req-title">NUIT Pessoal / Fiscal</h4>
              <p class="req-text">Cópia do cartão do NUIT ou comprovativo emitido pela Autoridade Tributária.</p>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <div class="req-box shadow-1">
              <q-icon name="receipt_long" size="36px" color="teal-7" class="q-mb-sm" />
              <h4 class="req-title">Rendimento ou Negócio</h4>
              <p class="req-text">Extrato de 3 meses (Banco ou M-Pesa), recibos salariais ou fotos da atividade comercial.</p>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <div class="req-box shadow-1">
              <q-icon name="home_work" size="36px" color="indigo-7" class="q-mb-sm" />
              <h4 class="req-title">Residência Atual</h4>
              <p class="req-text">Declaração de bairro, fatura de água/energia recente ou localização por GPS.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 9. DEPOIMENTOS DE CLIENTES MOÇAMBICANOS                      -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="depoimentos" class="section-padding bg-light">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag">Depoimentos</span>
          <h2 class="section-title">O Que Dizem os Nossos Clientes</h2>
          <p class="section-description">
            A satisfação e o sucesso de quem confia na Clack Microcrédito, EI.
          </p>
        </div>

        <div class="row q-col-gutter-lg justify-center">
          <div
            v-for="(t, idx) in testimonials"
            :key="idx"
            class="col-12 col-md-4"
          >
            <div class="testimonial-card shadow-1">
              <div class="rating-stars q-mb-sm">
                <q-icon
                  v-for="s in (t.rating || 5)"
                  :key="s"
                  name="star"
                  size="20px"
                  color="amber-6"
                />
              </div>

              <p class="testimonial-comment">
                "{{ t.comment }}"
              </p>

              <div class="testimonial-author row items-center q-mt-md">
                <q-avatar size="44px" color="navy-dark" text-color="amber-5" class="q-mr-sm">
                  {{ t.clientName?.charAt(0) || 'C' }}
                </q-avatar>
                <div>
                  <div class="author-name">{{ t.clientName }}</div>
                  <div class="author-meta">{{ t.clientRole }} • {{ t.clientLocation }}</div>
                  <div v-if="t.productType" class="author-product text-amber-8 text-caption">
                    {{ t.productType }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 10. PERGUNTAS FREQUENTES (FAQ)                                -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="faq" class="section-padding bg-white">
      <div class="container max-w-800">
        <div class="text-center section-heading">
          <span class="section-tag">Esclarecimentos</span>
          <h2 class="section-title">Perguntas Frequentes</h2>
          <p class="section-description">
            Tire todas as suas dúvidas sobre prazos, taxas, aprovação e formas de pagamento.
          </p>
        </div>

        <q-list separator class="faq-accordion-list">
          <q-expansion-item
            v-for="(faq, fIdx) in faqs"
            :key="fIdx"
            group="faqGroup"
            :label="faq.question"
            header-class="faq-header text-weight-bold text-dark"
            expand-icon-class="text-amber-8"
          >
            <q-card class="bg-grey-1">
              <q-card-section class="text-body2 text-grey-8 line-height-relaxed">
                {{ faq.answer }}
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </q-list>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 11. CONTACTO & FORMULÁRIO DE LEADS                           -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="contacto" class="section-padding bg-navy-dark text-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag tag-amber">Fale Connosco</span>
          <h2 class="section-title text-white">Estamos Sempre Perto de Si</h2>
          <p class="section-description text-grey-3">
            Entre em contacto por formulário, telefone ou visite as nossas instalações em Maputo.
          </p>
        </div>

        <div class="row q-col-gutter-xl">
          <!-- Dados de Contacto -->
          <div class="col-12 col-lg-5">
            <div class="contact-info-cards column q-gutter-md">
              <div class="contact-card">
                <q-icon name="location_on" size="28px" color="amber-5" />
                <div class="q-ml-md">
                  <div class="contact-card-title">Endereço Físico</div>
                  <div class="contact-card-text text-grey-3">
                    {{ config.address || 'Av. 25 de Setembro, Prédio Maryah, Maputo, Moçambique' }}
                  </div>
                </div>
              </div>

              <div class="contact-card">
                <q-icon name="call" size="28px" color="amber-5" />
                <div class="q-ml-md">
                  <div class="contact-card-title">Telefones Diretos</div>
                  <div class="contact-card-text text-grey-3">
                    <div>Vodacom: <a :href="`tel:${cleanPhone(config.phone)}`" class="text-white">{{ config.phone || '+258 84 835 3816' }}</a></div>
                    <div v-if="config.phoneSecondary">Movitel: <a :href="`tel:${cleanPhone(config.phoneSecondary)}`" class="text-white">{{ config.phoneSecondary }}</a></div>
                  </div>
                </div>
              </div>

              <div class="contact-card">
                <q-icon name="chat" size="28px" color="positive" />
                <div class="q-ml-md">
                  <div class="contact-card-title">Atendimento via WhatsApp</div>
                  <div class="contact-card-text text-grey-3">
                    Disponível para esclarecimento imediato de dúvidas e envio de propostas.
                  </div>
                  <q-btn
                    unelevated
                    dense
                    color="positive"
                    icon="chat"
                    label="Conversar no WhatsApp"
                    size="sm"
                    class="q-mt-xs q-px-sm"
                    :href="whatsappUrl"
                    target="_blank"
                  />
                </div>
              </div>

              <div class="contact-card">
                <q-icon name="schedule" size="28px" color="amber-5" />
                <div class="q-ml-md">
                  <div class="contact-card-title">Horário de Atendimento</div>
                  <div class="contact-card-text text-grey-3">
                    {{ config.workingHours || 'Segunda a Sexta: 08:00 - 17:00 | Sábado: 08:00 - 12:30' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Formulário de Lead / Candidatura -->
          <div class="col-12 col-lg-7">
            <div class="lead-form-box">
              <h3 class="form-title text-white q-mb-xs">Envie a sua Proposta ou Dúvida</h3>
              <p class="text-caption text-grey-3 q-mb-lg">
                Preencha os seus dados e a nossa equipa entrará em contacto com uma resposta formal.
              </p>

              <q-form @submit.prevent="submitContactLead" class="column q-gutter-md">
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="contactForm.name"
                      label="Nome Completo *"
                      dark
                      outlined
                      dense
                      :rules="[val => !!val || 'Informe o seu nome']"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="contactForm.phone"
                      label="Contacto Telefónico / WhatsApp *"
                      dark
                      outlined
                      dense
                      mask="### ## ### ####"
                      unmasked-value
                      placeholder="84 835 3816"
                      :rules="[val => !!val || 'Informe o seu telemóvel']"
                    />
                  </div>
                </div>

                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="contactForm.email"
                      label="Endereço de E-mail (Opcional)"
                      dark
                      outlined
                      dense
                      type="email"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="contactForm.city"
                      label="Cidade / Província"
                      dark
                      outlined
                      dense
                      placeholder="Ex: Maputo, Matola, etc."
                    />
                  </div>
                </div>

                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model.number="contactForm.amount"
                      label="Montante Desejado (MZN)"
                      dark
                      outlined
                      dense
                      type="number"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-select
                      v-model="contactForm.productSlug"
                      :options="productOptions"
                      label="Modalidade de Interesse"
                      dark
                      outlined
                      dense
                      emit-value
                      map-options
                    />
                  </div>
                </div>

                <q-input
                  v-model="contactForm.message"
                  label="Mensagem ou Informação Adicional"
                  dark
                  outlined
                  dense
                  type="textarea"
                  rows="3"
                />

                <q-btn
                  type="submit"
                  unelevated
                  color="amber-6"
                  text-color="dark"
                  icon="send"
                  label="Submeter Pedido de Crédito"
                  size="md"
                  class="full-width q-py-sm text-weight-bold"
                  :loading="submittingLead"
                />
              </q-form>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 12. FOOTER INSTITUCIONAL                                      -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <footer class="site-footer">
      <div class="container footer-container">
        <div class="row q-col-gutter-xl q-pb-xl">
          <!-- Coluna 1: Sobre & Identificação Legal -->
          <div class="col-12 col-md-4">
            <div class="row items-center q-mb-md">
              <div class="brand-logo-badge q-mr-sm">
                <q-icon name="account_balance" size="22px" color="white" />
              </div>
              <span class="text-h6 text-weight-bold text-white">Clack Microcrédito, EI</span>
            </div>
            <p class="text-caption text-grey-4 line-height-relaxed q-mb-md">
              Instituição moçambicana de microcrédito voltada ao fomento do empreendedorismo local, liquidez para pequenos negócios e soluções financeiras familiares transparentes.
            </p>
            <div class="social-links row q-gutter-sm">
              <q-btn v-if="config.facebookUrl" flat round dense icon="facebook" color="white" :href="config.facebookUrl" target="_blank" />
              <q-btn v-if="config.instagramUrl" flat round dense icon="photo_camera" color="white" :href="config.instagramUrl" target="_blank" />
              <q-btn flat round dense icon="chat" color="positive" :href="whatsappUrl" target="_blank" />
            </div>
          </div>

          <!-- Coluna 2: Links Rápidos -->
          <div class="col-12 col-sm-6 col-md-4">
            <h4 class="footer-col-title text-white">Links Rápidos</h4>
            <ul class="footer-links-list">
              <li><a href="#inicio">Início</a></li>
              <li><a href="#sobre">Sobre a Instituição</a></li>
              <li><a href="#produtos">Produtos & Modalidades</a></li>
              <li><a href="#simulador">Simulador de Crédito</a></li>
              <li><a href="#como-funciona">Como Funciona</a></li>
              <li><a href="#requisitos">Requisitos Documentais</a></li>
              <li><a href="#faq">Perguntas Frequentes</a></li>
              <li><a href="#contacto">Fale Connosco</a></li>
            </ul>
          </div>

          <!-- Coluna 3: Acesso Restrito & Aviso Legal -->
          <div class="col-12 col-sm-6 col-md-4">
            <h4 class="footer-col-title text-white">Área Reservada</h4>
            <p class="text-caption text-grey-4 q-mb-md">
              Acesso exclusivo para colaboradores autorizados, operadores e gestores de crédito da Clack Microcrédito.
            </p>
            <q-btn
              outline
              color="amber-5"
              text-color="white"
              icon="lock"
              label="Aceder ao Painel Administrativo"
              class="full-width q-py-xs q-mb-md"
              :href="systemUrl"
            />
            <div class="legal-badge text-caption text-grey-4">
              <q-icon name="gavel" size="14px" class="q-mr-xs text-amber-5" />
              Registo Comercial e NUIT devidamente licenciados em Moçambique.
            </div>
          </div>
        </div>

        <q-separator dark class="q-mb-md" />

        <div class="row justify-between items-center text-caption text-grey-4 q-py-sm">
          <div>
            © {{ currentYear }} <strong>Clack Microcrédito, EI</strong>. Todos os direitos reservados.
          </div>
          <div class="row q-gutter-md">
            <span>Maputo, Moçambique</span>
            <span>Valores em Meticais (MZN)</span>
          </div>
        </div>
      </div>
    </footer>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- MODAL DE CANDIDATURA ONLINE (PEDIDO DE PROPOSTA)             -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <q-dialog v-model="leadModalOpen">
      <q-card class="lead-modal-card bg-navy-dark text-white">
        <q-card-section class="row items-center justify-between border-bottom">
          <div class="row items-center">
            <q-icon name="assignment" size="24px" color="amber-5" class="q-mr-sm" />
            <div class="text-h6 text-weight-bold">Submeter Proposta de Crédito</div>
          </div>
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="modal-sim-summary q-pa-sm q-mb-md bg-navy-light text-caption rounded-borders">
            <div class="row justify-between">
              <span>Modalidade:</span>
              <strong class="text-amber-4">{{ selectedProduct?.title }}</strong>
            </div>
            <div class="row justify-between">
              <span>Montante:</span>
              <strong class="text-white">{{ formatMoney(simAmount) }}</strong>
            </div>
            <div class="row justify-between">
              <span>Prazo:</span>
              <strong class="text-white">{{ simTerm }} Meses</strong>
            </div>
            <div class="row justify-between">
              <span>Prestação Estimada:</span>
              <strong class="text-amber-4">{{ formatMoney(simMonthlyPayment) }} / mês</strong>
            </div>
          </div>

          <q-form @submit.prevent="submitModalLead" class="column q-gutter-sm">
            <q-input
              v-model="modalForm.name"
              label="Nome Completo *"
              dark
              outlined
              dense
              :rules="[val => !!val || 'Informe o seu nome']"
            />
            <q-input
              v-model="modalForm.phone"
              label="Contacto Móvel (M-Pesa / Vodacom) *"
              dark
              outlined
              dense
              placeholder="Ex: 84 835 3816"
              :rules="[val => !!val || 'Informe o seu telemóvel']"
            />
            <q-input
              v-model="modalForm.city"
              label="Cidade / Bairro"
              dark
              outlined
              dense
              placeholder="Ex: Maputo - Baixa"
            />
            <q-input
              v-model="modalForm.message"
              label="Observações ou Finalidade do Crédito"
              dark
              outlined
              dense
              type="textarea"
              rows="2"
            />

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Cancelar" color="grey-4" v-close-popup />
              <q-btn
                type="submit"
                unelevated
                color="amber-6"
                text-color="dark"
                icon="send"
                label="Enviar Proposta"
                :loading="submittingLead"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Floating WhatsApp Widget Button -->
    <a :href="whatsappUrl" target="_blank" class="floating-whatsapp-btn" title="Falar no WhatsApp">
      <q-icon name="chat" size="30px" color="white" />
    </a>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const isScrolled = ref(false)
const mobileDrawer = ref(false)
const submittingLead = ref(false)
const leadModalOpen = ref(false)
const currentYear = new Date().getFullYear()

// Dados Dinâmicos Carregados da API
const config = ref({})
const products = ref([])
const testimonials = ref([])
const faqs = ref([])

// Simulador Rápido (Hero)
const quickAmount = ref(15000)
const quickTerm = ref(2)

// Simulador Principal Completo
const selectedProduct = ref(null)
const simAmount = ref(20000)
const simTerm = ref(3)

// Formulário de Contacto Lead
const contactForm = ref({
  name: '',
  phone: '',
  email: '',
  city: 'Maputo',
  amount: 20000,
  productSlug: 'credito-negocio',
  message: ''
})

// Formulário do Modal de Lead
const modalForm = ref({
  name: '',
  phone: '',
  city: 'Maputo',
  message: ''
})

// URL do sistema de gestão
const systemUrl = computed(() => {
  const host = window.location.hostname
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return '/login'
  }
  return 'https://web.clackmicrocredito.com/login'
})

// WhatsApp link dinâmico
const cleanPhone = (phone) => {
  if (!phone) return '258848353816'
  return String(phone).replace(/\D/g, '')
}

const whatsappUrl = computed(() => {
  const num = cleanPhone(config.value.whatsapp || '258848353816')
  const text = encodeURIComponent(
    'Olá! Gostaria de informações sobre solicitação de crédito na Clack Microcrédito, EI.'
  )
  return `https://wa.me/${num}?text=${text}`
})

// Opções para o select de produtos
const productOptions = computed(() => {
  return products.value.map(p => ({
    label: p.title,
    value: p.slug
  }))
})

// Cálculos do Simulador Rápido
const quickMonthlyPayment = computed(() => {
  const rate = Number(config.value.defaultInterestRate || 15) / 100
  const capital = Number(quickAmount.value || 0)
  const term = Number(quickTerm.value || 1)
  // Cálculo linear padrão do microcrédito moçambicano:
  // Juros mensais = Capital * Taxa
  // Prestação = (Capital / Prazo) + (Capital * Taxa)
  const monthlyPrincipal = capital / term
  const monthlyInterest = capital * rate
  return Math.round(monthlyPrincipal + monthlyInterest)
})

const quickTotalPayment = computed(() => {
  return Math.round(quickMonthlyPayment.value * quickTerm.value)
})

// Cálculos do Simulador Completo
const simInterestRate = computed(() => {
  if (selectedProduct.value && selectedProduct.value.interestRate) {
    return Number(selectedProduct.value.interestRate)
  }
  return Number(config.value.defaultInterestRate || 15)
})

const simMonthlyPayment = computed(() => {
  const rate = simInterestRate.value / 100
  const capital = Number(simAmount.value || 0)
  const term = Number(simTerm.value || 1)
  const monthlyPrincipal = capital / term
  const monthlyInterest = capital * rate
  return Math.round(monthlyPrincipal + monthlyInterest)
})

const simTotalInterest = computed(() => {
  const rate = simInterestRate.value / 100
  const capital = Number(simAmount.value || 0)
  const term = Number(simTerm.value || 1)
  return Math.round(capital * rate * term)
})

const simTotalPayment = computed(() => {
  return Number(simAmount.value || 0) + simTotalInterest.value
})

// Formatação Monetária em MZN
const formatMoney = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0,00 MZN'
  return Number(val).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

// Utilitário para quebrar texto em linhas
const splitLines = (text) => {
  if (!text) return []
  return text.split(/\r?\n/).filter(line => line.trim().length > 0)
}

// Selecionar Produto
const selectProductForSimulation = (prod) => {
  selectedProduct.value = prod
  if (prod.minAmount && simAmount.value < prod.minAmount) {
    simAmount.value = Number(prod.minAmount)
  }
  if (prod.maxAmount && simAmount.value > prod.maxAmount) {
    simAmount.value = Number(prod.maxAmount)
  }
  if (prod.maxTerm && simTerm.value > prod.maxTerm) {
    simTerm.value = Number(prod.maxTerm)
  }
  // Scroll suave até o simulador se não estiver visível
  const el = document.getElementById('simulador')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

// Enviar Simulação Rápida para o WhatsApp
const sendQuickWhatsApp = () => {
  const num = cleanPhone(config.value.whatsapp || '258848353816')
  const msg =
    `Olá Clack Microcrédito! Fiz uma simulação rápida no website e gostaria de solicitar:\n\n` +
    `• Montante: ${formatMoney(quickAmount.value)}\n` +
    `• Prazo: ${quickTerm.value} ${quickTerm.value === 1 ? 'mês' : 'meses'}\n` +
    `• Prestação Estimada: ${formatMoney(quickMonthlyPayment.value)}/mês\n` +
    `• Total a Reembolsar: ${formatMoney(quickTotalPayment.value)}\n\n` +
    `Como posso proceder com o envio da documentação?`
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
}

// Enviar Simulação Completa para o WhatsApp
const sendFullWhatsApp = () => {
  const num = cleanPhone(config.value.whatsapp || '258848353816')
  const prodName = selectedProduct.value?.title || 'Crédito'
  const msg =
    `Olá Clack Microcrédito! Gostaria de avançar com o seguinte pedido de crédito:\n\n` +
    `• Linha: ${prodName}\n` +
    `• Montante Solicitado: ${formatMoney(simAmount.value)}\n` +
    `• Prazo: ${simTerm.value} ${simTerm.value === 1 ? 'mês' : 'meses'}\n` +
    `• Taxa Aplicada: ${simInterestRate.value}% a.m.\n` +
    `• Prestação Mensal: ${formatMoney(simMonthlyPayment.value)}\n` +
    `• Total Estimado: ${formatMoney(simTotalPayment.value)}\n\n` +
    `Aguardo instruções para formalização e envio do BI e extratos.`
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
}

// Abrir Modal de Lead
const openLeadModal = () => {
  modalForm.value.name = contactForm.value.name || ''
  modalForm.value.phone = contactForm.value.phone || ''
  leadModalOpen.value = true
}

// Submeter Lead pelo Formulário Principal de Contacto
const submitContactLead = async () => {
  submittingLead.value = true
  try {
    const payload = {
      name: contactForm.value.name,
      phone: contactForm.value.phone,
      email: contactForm.value.email,
      city: contactForm.value.city,
      amount: contactForm.value.amount,
      term: simTerm.value,
      productSlug: contactForm.value.productSlug,
      message: contactForm.value.message,
      source: 'WEBSITE_CONTACT_FORM'
    }

    const res = await axios.post('/api/public/site/lead', payload)
    if (res.data.success) {
      $q.notify({
        type: 'positive',
        message: 'Pedido submetido com sucesso! Entraremos em contacto brevemente.',
        position: 'top',
        timeout: 5000
      })
      contactForm.value.name = ''
      contactForm.value.phone = ''
      contactForm.value.email = ''
      contactForm.value.message = ''
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível registar o pedido no momento. Por favor use o WhatsApp.',
      position: 'top'
    })
  } finally {
    submittingLead.value = false
  }
}

// Submeter Lead pelo Modal
const submitModalLead = async () => {
  submittingLead.value = true
  try {
    const payload = {
      name: modalForm.value.name,
      phone: modalForm.value.phone,
      city: modalForm.value.city,
      amount: simAmount.value,
      term: simTerm.value,
      productSlug: selectedProduct.value?.slug || 'geral',
      message: modalForm.value.message || 'Pedido gerado através do simulador de crédito.',
      source: 'WEBSITE_SIMULATOR_MODAL'
    }

    const res = await axios.post('/api/public/site/lead', payload)
    if (res.data.success) {
      $q.notify({
        type: 'positive',
        message: 'Proposta enviada com sucesso! A equipa Clack Microcrédito entrará em contacto.',
        position: 'top',
        timeout: 6000
      })
      leadModalOpen.value = false
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Erro ao enviar proposta. Pode enviar diretamente pelo WhatsApp.',
      position: 'top'
    })
  } finally {
    submittingLead.value = false
  }
}

// Navegação suave no menu mobile
const navigateTo = (target) => {
  mobileDrawer.value = false
  const el = document.querySelector(target)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

// Carregar Dados do Website
const loadWebsiteData = async () => {
  try {
    const res = await axios.get('/api/public/site/content')
    if (res.data.success) {
      config.value = res.data.config || {}
      products.value = res.data.products || []
      testimonials.value = res.data.testimonials || []
      faqs.value = res.data.faqs || []

      if (products.value.length > 0) {
        selectedProduct.value = products.value[0]
      }
      if (config.value.metaTitle) {
        document.title = config.value.metaTitle
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar conteúdo do site, usando padrões:', e)
  }
}

// Tratamento do Scroll para a Navbar
const handleScroll = () => {
  isScrolled.value = window.scrollY > 40
}

onMounted(() => {
  loadWebsiteData()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ── PALETA INSTITUCIONAL CLACK MICROCRÉDITO ── */
/* Azul Marinho Profundo: #0a192f / #0f2b48 | Dourado/Âmbar: #d97706 / #f59e0b */
.bg-navy-dark {
  background-color: #0b1f3a !important;
}
.bg-navy-light {
  background-color: #14325a !important;
}
.bg-light {
  background-color: #f8fafc !important;
}

.clack-website {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background-color: #ffffff;
  overflow-x: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
.max-w-800 {
  max-width: 800px;
  margin: 0 auto;
}

/* ── HEADER & NAVBAR ── */
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(11, 31, 58, 0.95);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.site-header.scrolled {
  background: rgba(11, 31, 58, 0.98);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.top-bar {
  background-color: #071527;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.hover-amber:hover {
  color: #f59e0b !important;
}
.main-nav {
  padding: 14px 0;
}
.brand-link {
  display: flex;
  align-items: center;
  color: inherit;
}
.brand-logo-badge {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #d97706, #f59e0b);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
}
.brand-title {
  display: block;
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
}
.brand-subtitle {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  letter-spacing: 0.5px;
}
.desktop-links .nav-item {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}
.desktop-links .nav-item:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}
.highlight-link {
  color: #f59e0b !important;
  font-weight: 700 !important;
}
.system-login-btn {
  border-radius: 8px;
  font-weight: 600;
}

/* ── HERO SECTION ── */
.hero-section {
  position: relative;
  background: linear-gradient(135deg, #071527 0%, #0b1f3a 50%, #12345e 100%);
  padding: 160px 0 100px;
  overflow: hidden;
}
.hero-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 20% 30%, rgba(245, 158, 11, 0.08) 0%, transparent 50%),
                    radial-gradient(circle at 80% 70%, rgba(30, 64, 175, 0.15) 0%, transparent 60%);
  pointer-events: none;
}
.hero-container {
  position: relative;
  z-index: 2;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 30px;
  color: #fde68a;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 20px;
}
.hero-title {
  font-size: 2.8rem;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.02em;
  margin-bottom: 18px;
}
.hero-subtitle {
  font-size: 1.12rem;
  line-height: 1.6;
  max-width: 620px;
  margin-bottom: 24px;
}
.hero-btn-primary {
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
}
.hero-btn-secondary {
  border-radius: 10px;
}
.trust-chips {
  margin-top: 30px;
}
.trust-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #e2e8f0;
}

/* ── HERO SIMULATOR CARD ── */
.simulator-card-hero {
  background: rgba(15, 43, 78, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  overflow: hidden;
}
.card-hero-header {
  background: rgba(7, 21, 39, 0.6);
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.card-hero-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}
.card-hero-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 2px 0 0;
}
.sim-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #e2e8f0;
}
.sim-val-display {
  font-size: 1.1rem;
  font-weight: 700;
}
.sim-summary-box {
  background: rgba(7, 21, 39, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

/* ── TRUST STATS ── */
.trust-stats-section {
  background-color: #071527;
  padding: 40px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.stat-number {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 0.85rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ── GENERAL SECTIONS ── */
.section-padding {
  padding: 90px 0;
}
.section-heading {
  margin-bottom: 50px;
}
.section-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  background: #e2e8f0;
  color: #0f2b48;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.tag-amber {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}
.section-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.section-description {
  font-size: 1.05rem;
  color: #64748b;
  max-width: 650px;
  margin: 0 auto;
}

/* ── ABOUT US ── */
.about-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 16px;
}
.about-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
}
.about-pillars-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.pillar-box {
  background: #ffffff;
  padding: 22px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}
.pillar-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.pillar-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
}
.pillar-text {
  font-size: 0.84rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* ── PRODUCTS ── */
.product-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.3s, box-shadow 0.3s;
}
.product-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
}
.featured-product {
  border: 2px solid #f59e0b;
}
.product-badge {
  position: absolute;
  top: -12px;
  right: 20px;
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  text-transform: uppercase;
}
.product-icon-wrap {
  width: 56px;
  height: 56px;
  background: #fef3c7;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.product-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}
.product-summary {
  font-size: 0.86rem;
  color: #64748b;
  line-height: 1.45;
  margin-bottom: 16px;
}
.product-specs {
  background: #f8fafc;
  padding: 12px;
  border-radius: 10px;
}
.spec-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  padding: 4px 0;
}
.spec-label {
  color: #64748b;
}
.select-prod-btn {
  border-radius: 10px;
  font-weight: 600;
}

/* ── FULL SIMULATOR SECTION ── */
.simulator-main-box {
  background: rgba(15, 43, 78, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}
.sim-ctrl-label {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
}
.amount-input-box {
  display: flex;
  align-items: center;
  background: rgba(7, 21, 39, 0.8);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 8px;
  padding: 4px 10px;
}
.currency-tag {
  font-size: 0.85rem;
  font-weight: 700;
  color: #f59e0b;
  margin-right: 6px;
}
.custom-number-input {
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
  width: 140px;
  text-align: right;
}
.sim-result-card {
  background: rgba(7, 21, 39, 0.85);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 18px;
  padding: 24px;
}
.result-highlight-box {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 12px;
}

/* ── STEPS ── */
.step-card {
  position: relative;
  background: #ffffff;
  padding: 36px 24px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  height: 100%;
}
.step-number-bubble {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  background: #0f2b48;
  color: #ffffff;
  font-weight: 800;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-icon-box {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}
.step-text {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* ── REQUIREMENTS ── */
.req-box {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  border: 1px solid #e2e8f0;
  height: 100%;
}
.req-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}
.req-text {
  font-size: 0.84rem;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
}

/* ── TESTIMONIALS ── */
.testimonial-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 26px;
  border: 1px solid #e2e8f0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.testimonial-comment {
  font-size: 0.92rem;
  color: #334155;
  font-style: italic;
  line-height: 1.6;
}
.author-name {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.95rem;
}
.author-meta {
  font-size: 0.78rem;
  color: #64748b;
}

/* ── FAQ ── */
.faq-accordion-list {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.faq-header {
  font-size: 1rem;
  padding: 16px 20px;
}

/* ── CONTACT ── */
.contact-card {
  display: flex;
  align-items: flex-start;
  background: rgba(15, 43, 78, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px;
}
.contact-card-title {
  font-weight: 700;
  color: #ffffff;
  font-size: 0.95rem;
  margin-bottom: 2px;
}
.contact-card-text {
  font-size: 0.86rem;
  line-height: 1.45;
}
.lead-form-box {
  background: rgba(15, 43, 78, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 30px;
}
.form-title {
  font-size: 1.4rem;
  font-weight: 700;
}

/* ── FOOTER ── */
.site-footer {
  background-color: #050d18;
  color: #cbd5e1;
  padding: 60px 0 20px;
}
.footer-col-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 16px;
}
.footer-links-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.footer-links-list li {
  margin-bottom: 8px;
}
.footer-links-list a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.88rem;
  transition: color 0.2s;
}
.footer-links-list a:hover {
  color: #f59e0b;
}

/* ── FLOATING WHATSAPP ── */
.floating-whatsapp-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 58px;
  height: 58px;
  background-color: #25d366;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 18px rgba(37, 211, 102, 0.5);
  z-index: 999;
  transition: transform 0.3s;
}
.floating-whatsapp-btn:hover {
  transform: scale(1.1);
}

.lead-modal-card {
  width: 500px;
  max-width: 90vw;
  border-radius: 18px;
}
.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  .section-title {
    font-size: 1.8rem;
  }
  .about-pillars-grid {
    grid-template-columns: 1fr;
  }
  .simulator-main-box {
    padding: 20px;
  }
}
</style>
