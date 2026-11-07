<template>
  <div class="clack-website">
    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 1. TOP BAR ÚNICA                                               -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <header class="site-header" :class="{ 'scrolled': isScrolled }">
      <div class="top-bar">
        <div class="container row items-center justify-between text-caption text-grey-4">
          <div class="row items-center q-gutter-md">
            <span class="row items-center q-gutter-xs">
              <q-icon name="chat" size="14px" color="positive" />
              <span>WhatsApp Oficial:</span>
              <a :href="whatsappUrl" target="_blank" class="text-white hover-amber font-weight-medium">
                {{ officialContact.phone || officialContact.whatsappDisplay }}
              </a>
            </span>
            <span class="row items-center q-gutter-xs gt-xs">
              <q-icon name="email" size="14px" color="amber-5" />
              <a :href="`mailto:${officialContact.email}`" class="text-white hover-amber">
                {{ officialContact.email }}
              </a>
            </span>
          </div>
          <div class="row items-center q-gutter-sm">
            <span class="text-amber-4 text-weight-medium row items-center q-gutter-xs">
              <q-icon name="verified" size="15px" />
              <span>Instituição de Microcrédito Autorizada</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- 2. NAVBAR ÚNICA                                                -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <nav class="main-nav">
        <div class="container row items-center justify-between">
          <!-- Logo & Nome Institucional -->
          <a href="#inicio" class="brand-link row items-center no-wrap text-decoration-none">
            <div class="brand-logo-badge">
              <q-icon name="account_balance" size="26px" color="white" />
            </div>
            <div class="brand-info q-ml-sm">
              <span class="brand-title">Clack Microcrédito</span>
              <span class="brand-subtitle">Entidade Individual • Moçambique</span>
            </div>
          </a>

          <!-- Desktop Links de Navegação -->
          <div class="desktop-links gt-md row items-center q-gutter-md">
            <a href="#inicio" class="nav-item">Início</a>
            <a href="#simulador" class="nav-item highlight-link">Simulador</a>
            <a href="#produtos" class="nav-item">Produtos</a>
            <a href="#sobre" class="nav-item">Sobre Nós</a>
            <a href="#porque-clack" class="nav-item">Porquê a Clack?</a>
            <a href="#como-funciona" class="nav-item">Como Funciona</a>
            <a href="#faq" class="nav-item">FAQ</a>
            <a href="#contacto" class="nav-item">Contacto</a>
          </div>

          <!-- Botão Aceder ao Sistema -->
          <div class="row items-center q-gutter-sm">
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

    <!-- Menu Lateral Mobile (Dialog Lateral sem exigir QLayout) -->
    <q-dialog
      v-model="mobileDrawer"
      position="right"
      full-height
      transition-show="slide-left"
      transition-hide="slide-right"
    >
      <q-card class="mobile-menu-drawer bg-navy-dark text-white full-height" style="min-width: 290px; max-width: 85vw">
        <div class="q-pa-md column full-height justify-between">
          <div>
            <div class="row items-center justify-between q-mb-lg">
              <div class="row items-center">
                <q-icon name="account_balance" size="22px" color="amber-5" class="q-mr-xs" />
                <span class="text-subtitle1 text-weight-bold">Clack Microcrédito</span>
              </div>
              <q-btn flat round dense icon="close" color="white" v-close-popup />
            </div>

            <q-list dark separator class="mobile-nav-list">
              <q-item clickable v-ripple @click="navigateTo('#inicio')">
                <q-item-section avatar><q-icon name="home" color="amber-5" /></q-item-section>
                <q-item-section>Início</q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="navigateTo('#simulador')">
                <q-item-section avatar><q-icon name="calculate" color="amber-5" /></q-item-section>
                <q-item-section class="text-amber-4 text-weight-bold">Simulador de Crédito</q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="navigateTo('#produtos')">
                <q-item-section avatar><q-icon name="paid" color="amber-5" /></q-item-section>
                <q-item-section>Produtos de Crédito</q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="navigateTo('#sobre')">
                <q-item-section avatar><q-icon name="corporate_fare" color="amber-5" /></q-item-section>
                <q-item-section>Sobre Nós</q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="navigateTo('#porque-clack')">
                <q-item-section avatar><q-icon name="verified" color="amber-5" /></q-item-section>
                <q-item-section>Porquê a Clack?</q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="navigateTo('#como-funciona')">
                <q-item-section avatar><q-icon name="checklist_rtl" color="amber-5" /></q-item-section>
                <q-item-section>Como Funciona</q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="navigateTo('#faq')">
                <q-item-section avatar><q-icon name="help_outline" color="amber-5" /></q-item-section>
                <q-item-section>Perguntas Frequentes</q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="navigateTo('#contacto')">
                <q-item-section avatar><q-icon name="contact_phone" color="amber-5" /></q-item-section>
                <q-item-section>Contacto</q-item-section>
              </q-item>
            </q-list>
          </div>

          <div class="q-pt-lg column q-gutter-sm">
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
      </q-card>
    </q-dialog>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 3. HERO SECTION (FOCO CORPORATIVO, SEM REPETIÇÕES)             -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="inicio" class="hero-section text-center">
      <div class="hero-bg-overlay"></div>
      <div class="container hero-container">
        <div class="hero-content-wrapper">
          <h1 class="hero-title text-white">
            Crédito Rápido, Justo e Sem Burocracia em Moçambique
          </h1>

          <p class="hero-subtitle text-grey-3">
            Impulsione o seu negócio ou resolva imprevistos familiares com aprovação em até 24 horas.
            Desembolso imediato na sua conta bancária ou via M-Pesa com as melhores taxas do mercado.
          </p>

          <div class="hero-actions row justify-center items-center q-gutter-md q-mt-md">
            <q-btn
              unelevated
              color="amber-6"
              text-color="dark"
              icon="calculate"
              size="lg"
              class="hero-btn-primary text-weight-bold"
              @click="scrollTo('#simulador')"
              label="Simular o Meu Crédito"
            />
            <q-btn
              outline
              color="white"
              icon="payments"
              size="lg"
              class="hero-btn-secondary"
              @click="scrollTo('#produtos')"
              label="Ver Produtos"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 4. SIMULADOR ÚNICO - CRÉDITO CLACK                             -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="simulador" class="section-padding bg-navy-dark text-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag tag-amber">Calculadora Oficial</span>
          <h2 class="section-title text-white">Simulador de Crédito Clack</h2>
          <p class="section-description text-grey-3">
            Ajuste os valores e veja em tempo real o valor da prestação mensal e o total a reembolsar.
          </p>
        </div>

        <div class="simulator-main-box">
          <div class="row q-col-gutter-xl items-center">
            <!-- Coluna de Controles do Simulador -->
            <div class="col-12 col-lg-7">
              <!-- 1. Modalidade de Crédito -->
              <div class="sim-ctrl-group q-mb-lg">
                <label class="sim-ctrl-label">1. Modalidade de Crédito</label>
                <div class="row q-gutter-sm q-mt-xs">
                  <q-btn
                    v-for="p in availableProducts"
                    :key="p.slug"
                    :outline="selectedProduct?.slug !== p.slug"
                    :unelevated="selectedProduct?.slug === p.slug"
                    :color="selectedProduct?.slug === p.slug ? 'amber-6' : 'white'"
                    :text-color="selectedProduct?.slug === p.slug ? 'dark' : 'white'"
                    size="sm"
                    no-caps
                    class="q-px-md text-weight-medium rounded-borders"
                    @click="selectProductForSimulation(p)"
                  >
                    {{ p.title }}
                  </q-btn>
                </div>
              </div>

              <!-- 2. Montante Pretendido -->
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

              <!-- 3. Prazo de Reembolso -->
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
                  :max="Number(selectedProduct?.maxTerm || 6)"
                  :step="1"
                  color="amber-5"
                  track-color="blue-grey-8"
                  thumb-size="24px"
                />
                <div class="row justify-between text-caption text-grey-4">
                  <span>{{ selectedProduct?.minTerm || 1 }} mês</span>
                  <span>{{ selectedProduct?.maxTerm || 6 }} meses</span>
                </div>
              </div>
            </div>

            <!-- Coluna de Resumo da Simulação (O Card que o usuário pediu para manter) -->
            <div class="col-12 col-lg-5">
              <div class="sim-result-card">
                <div class="sim-result-header">
                  <span class="text-caption text-grey-4 uppercase letter-spacing-1">Resumo da Simulação</span>
                  <h4 class="text-h5 text-weight-bold text-white q-mt-xs q-mb-none">
                    Crédito Clack
                  </h4>
                  <div class="text-caption text-amber-4 q-mt-xs">{{ selectedProduct?.title }}</div>
                </div>

                <div class="sim-result-body">
                  <div class="result-highlight-box q-pa-md q-mb-md text-center">
                    <div class="text-caption text-grey-3">Prestação Mensal Estimada</div>
                    <div class="text-h4 text-weight-bolder text-amber-4 q-mt-xs font-mono">
                      {{ formatMoney(simMonthlyPayment) }}
                    </div>
                    <div class="text-caption text-grey-4 q-mt-xs">
                      por mês durante {{ simTerm }} {{ simTerm === 1 ? 'mês' : 'meses' }}
                    </div>
                  </div>

                  <div class="sim-specs-list q-mb-lg">
                    <div class="spec-item row justify-between q-py-xs">
                      <span class="text-grey-4">Capital Financiado:</span>
                      <span class="text-white text-weight-medium">{{ formatMoney(simAmount) }}</span>
                    </div>
                    <div class="spec-item row justify-between q-py-xs">
                      <span class="text-grey-4">Taxa de Juros Mensal:</span>
                      <span class="text-amber-4 text-weight-medium">{{ simInterestRate }}% a.m.</span>
                    </div>
                    <div class="spec-item row justify-between q-py-xs">
                      <span class="text-grey-4">Total de Juros:</span>
                      <span class="text-white text-weight-medium">{{ formatMoney(simTotalInterest) }}</span>
                    </div>
                    <q-separator dark class="q-my-sm" />
                    <div class="spec-item row justify-between q-py-xs text-subtitle1">
                      <span class="text-grey-3 font-weight-bold">Total a Reembolsar:</span>
                      <span class="text-white font-weight-bold">{{ formatMoney(simTotalPayment) }}</span>
                    </div>
                  </div>

                  <!-- Os 2 Botões Oficiais do Simulador -->
                  <div class="column q-gutter-sm">
                    <q-btn
                      unelevated
                      color="positive"
                      text-color="white"
                      icon="chat"
                      size="md"
                      label="Solicitar via WhatsApp"
                      class="full-width q-py-sm text-weight-bold rounded-borders"
                      @click="sendWhatsAppSimulation"
                    />

                    <q-btn
                      unelevated
                      color="amber-6"
                      text-color="dark"
                      icon="assignment"
                      size="md"
                      label="Pedir Proposta Online"
                      class="full-width q-py-sm text-weight-bold rounded-borders"
                      @click="openLeadModal"
                    />
                  </div>

                  <p class="text-caption text-grey-4 text-center q-mt-md q-mb-none font-italic">
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
    <!-- 5. PRODUTOS DE CRÉDITO (3 CARDS)                               -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="produtos" class="section-padding bg-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag">Soluções Financeiras</span>
          <h2 class="section-title">Produtos de Crédito</h2>
          <p class="section-description">
            Modalidades transparentes com taxas competitivas e condições pensadas para o mercado moçambicano.
          </p>
        </div>

        <div class="row q-col-gutter-lg justify-center">
          <div
            v-for="prod in availableProducts"
            :key="prod.slug"
            class="col-12 col-md-4"
          >
            <div class="product-card" :class="{ 'featured-product': prod.featured }">
              <div v-if="prod.badge" class="product-badge">{{ prod.badge }}</div>

              <div class="product-header">
                <div class="product-icon-wrap">
                  <q-icon :name="prod.icon || 'payments'" size="30px" color="amber-8" />
                </div>
                <h3 class="product-title">{{ prod.title }}</h3>
                <p class="product-summary">{{ prod.summary }}</p>
              </div>

              <div class="product-specs q-mb-md">
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
                  <span class="spec-label">Taxa mensal:</span>
                  <span class="spec-value text-amber-9 font-weight-bold">{{ prod.interestRate }}% a.m.</span>
                </div>
              </div>

              <div class="product-details-box q-mb-md">
                <div class="text-caption text-weight-bold text-dark q-mb-xs">Requisitos principais:</div>
                <ul class="product-bullets q-pl-md q-my-none text-caption text-grey-8">
                  <li v-for="(req, ri) in splitLines(prod.requirements)" :key="ri">{{ req }}</li>
                </ul>
              </div>

              <div class="product-footer">
                <q-btn
                  outline
                  color="primary"
                  class="full-width select-prod-btn"
                  label="Selecionar no Simulador"
                  icon="calculate"
                  no-caps
                  @click="selectProductForSimulation(prod)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 6. SOBRE A CLACK MICROCRÉDITO                                  -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="sobre" class="section-padding bg-light">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag">Institucional</span>
          <h2 class="section-title">Sobre a Clack Microcrédito, EI</h2>
          <p class="section-description">
            Crédito Responsável, Transparente e Acessível para impulsionar negócios e apoiar famílias em Moçambique.
          </p>
        </div>

        <div class="row q-col-gutter-xl items-center q-mb-lg">
          <div class="col-12 col-md-6">
            <div class="about-text-content">
              <h3 class="about-title">Compromisso com o Desenvolvimento Económico</h3>
              <p class="text-body1 text-grey-8 line-height-relaxed q-mb-md">
                A Clack Microcrédito, EI é uma instituição financeira moçambicana orientada para apoiar micro-empreendedores,
                comerciantes e profissionais com linhas de crédito transparentes, prazos adequados e decisão célere.
              </p>
              <p class="text-body1 text-grey-8 line-height-relaxed q-mb-lg">
                Atuamos em conformidade rigorosa com as boas práticas financeiras e com a legislação moçambicana,
                eliminando entraves burocráticos desnecessários e garantindo apoio financeiro ético e personalizado.
              </p>

              <div class="row q-gutter-sm">
                <div class="about-pill">
                  <q-icon name="check_circle" color="positive" size="18px" />
                  <span>Conformidade Legal</span>
                </div>
                <div class="about-pill">
                  <q-icon name="check_circle" color="positive" size="18px" />
                  <span>Sem Custos Ocultos</span>
                </div>
                <div class="about-pill">
                  <q-icon name="check_circle" color="positive" size="18px" />
                  <span>Atendimento Humanizado</span>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="about-pillars-grid">
              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-blue-1 text-primary">
                  <q-icon name="flag" size="24px" />
                </div>
                <h4 class="pillar-title">Missão</h4>
                <p class="pillar-text">Prover soluções de crédito rápido, ético e sustentável que alavanquem o crescimento de negócios e o bem-estar das famílias moçambicanas.</p>
              </div>

              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-amber-1 text-amber-9">
                  <q-icon name="visibility" size="24px" />
                </div>
                <h4 class="pillar-title">Visão</h4>
                <p class="pillar-text">Ser a instituição de microfinanças de referência em Moçambique pela confiança, agilidade de resposta e proximidade com o cliente.</p>
              </div>

              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-teal-1 text-teal-8">
                  <q-icon name="handshake" size="24px" />
                </div>
                <h4 class="pillar-title">Valores</h4>
                <p class="pillar-text">Transparência total, rapidez de resposta, rigor financeiro, simplicidade processual e respeito mútuo.</p>
              </div>

              <div class="pillar-box shadow-1">
                <div class="pillar-icon-box bg-indigo-1 text-indigo-8">
                  <q-icon name="security" size="24px" />
                </div>
                <h4 class="pillar-title">Segurança</h4>
                <p class="pillar-text">Garantia absoluta de integridade de dados e celebração de contratos transparentes com total clareza de deveres e direitos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 7. PORQUÊ A CLACK? (SUBSTITUI A FAIXA DE ESTATÍSTICAS)         -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="porque-clack" class="section-padding bg-navy-dark text-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag tag-amber">Vantagens Corporativas</span>
          <h2 class="section-title text-white">Porquê Escolher a Clack Microcrédito?</h2>
          <p class="section-description text-grey-3">
            Pilares sólidos e benefícios reais para quem necessita de liquidez sem burocracias.
          </p>
        </div>

        <div class="row q-col-gutter-lg justify-center">
          <div class="col-12 col-sm-6 col-md-3">
            <div class="why-card">
              <div class="why-icon-box">
                <q-icon name="bolt" size="30px" color="amber-4" />
              </div>
              <h3 class="why-title">Aprovação em até 24h</h3>
              <p class="why-desc">
                Análise documental célere e processo simplificado para que tenha resposta e decisão no menor tempo possível.
              </p>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <div class="why-card">
              <div class="why-icon-box">
                <q-icon name="smartphone" size="30px" color="green-4" />
              </div>
              <h3 class="why-title">Desembolso M-Pesa / Banco</h3>
              <p class="why-desc">
                Recebimento flexível e imediato do montante aprovado diretamente na sua carteira móvel M-Pesa ou conta bancária.
              </p>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <div class="why-card">
              <div class="why-icon-box">
                <q-icon name="lock_open" size="30px" color="amber-4" />
              </div>
              <h3 class="why-title">Sem Hipoteca Pesada</h3>
              <p class="why-desc">
                Sem exigência de garantias patrimoniais desproporcionais ou hipotecas de imóveis para o acesso ao financiamento.
              </p>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <div class="why-card">
              <div class="why-icon-box">
                <q-icon name="payments" size="30px" color="amber-4" />
              </div>
              <h3 class="why-title">Valores em Meticais (MZN)</h3>
              <p class="why-desc">
                Total clareza e previsibilidade na moeda nacional, com taxa acordada e prestações fixas sem comissões ocultas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 8. COMO FUNCIONA (3 PASSOS)                                    -->
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
          <div class="col-12 col-md-4">
            <div class="step-card shadow-1">
              <div class="step-number-bubble">1</div>
              <div class="step-icon-box bg-blue-1 text-primary">
                <q-icon name="calculate" size="36px" />
              </div>
              <h3 class="step-title">Simula e Solicita</h3>
              <p class="step-text">
                Defina o montante e prazo no nosso simulador oficial ou envie os seus dados diretamente pelo WhatsApp.
              </p>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="step-card shadow-1">
              <div class="step-number-bubble">2</div>
              <div class="step-icon-box bg-amber-1 text-amber-9">
                <q-icon name="assignment_turned_in" size="36px" />
              </div>
              <h3 class="step-title">Envia Documentos</h3>
              <p class="step-text">
                Apresente o seu BI/DIRE, NUIT e comprovativo de renda ou atividade comercial para análise em até 24 horas.
              </p>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="step-card shadow-1">
              <div class="step-number-bubble">3</div>
              <div class="step-icon-box bg-green-1 text-positive">
                <q-icon name="account_balance_wallet" size="36px" />
              </div>
              <h3 class="step-title">Recebe o Dinheiro</h3>
              <p class="step-text">
                Após aprovação e formalização do contrato, o capital é creditado de imediato via M-Pesa ou transferência bancária.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 9. FAQ / TRANSPARÊNCIA                                         -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="faq" class="section-padding bg-white">
      <div class="container max-w-800">
        <div class="text-center section-heading">
          <span class="section-tag">Esclarecimentos</span>
          <h2 class="section-title">Perguntas Frequentes</h2>
          <p class="section-description">
            Tire todas as suas dúvidas sobre prazos, modalidades, taxas e formas de reembolso.
          </p>
        </div>

        <q-list separator class="faq-accordion-list shadow-1">
          <q-expansion-item
            v-for="(faq, fIdx) in faqsList"
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

        <p class="text-caption text-grey-6 text-center q-mt-lg q-mb-none font-italic">
          * Simulação indicativa sem compromisso. Sujeito à análise documental.
        </p>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 10. CONTACTO ÚNICO + FORMULÁRIO (CONSOLIDAÇÃO TOTAL)           -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <section id="contacto" class="section-padding bg-navy-dark text-white">
      <div class="container">
        <div class="text-center section-heading">
          <span class="section-tag tag-amber">Canais Oficiais</span>
          <h2 class="section-title text-white">Contacto & Envie a sua Proposta</h2>
          <p class="section-description text-grey-3">
            Entre em contacto com a nossa equipa através dos canais oficiais ou submeta a sua proposta pelo formulário.
          </p>
        </div>

        <div class="row q-col-gutter-xl items-start">
          <!-- Coluna de Informações Consolidadas Oficiais -->
          <div class="col-12 col-lg-5">
            <div class="official-contact-box">
              <h3 class="text-h6 text-weight-bold text-amber-4 q-mb-md">Informações da Entidade</h3>

              <div class="contact-entry q-mb-md">
                <div class="row items-center q-gutter-xs text-grey-4 text-caption uppercase">
                  <q-icon name="email" color="amber-5" size="16px" />
                  <span>Email</span>
                </div>
                <a :href="`mailto:${officialContact.email}`" class="contact-val text-white hover-amber">
                  {{ officialContact.email }}
                </a>
              </div>

              <div class="contact-entry q-mb-md">
                <div class="row items-center q-gutter-xs text-grey-4 text-caption uppercase">
                  <q-icon name="phone" color="amber-5" size="16px" />
                  <span>Telefone</span>
                </div>
                <a :href="`tel:${cleanPhone(officialContact.phone)}`" class="contact-val text-white hover-amber">
                  {{ officialContact.phone }}
                </a>
              </div>

              <div class="contact-entry q-mb-md">
                <div class="row items-center q-gutter-xs text-grey-4 text-caption uppercase">
                  <q-icon name="location_on" color="amber-5" size="16px" />
                  <span>Endereço</span>
                </div>
                <div class="contact-val text-grey-2">
                  {{ officialContact.address }}
                </div>
              </div>

              <div class="contact-entry q-mb-lg">
                <div class="row items-center q-gutter-xs text-grey-4 text-caption uppercase">
                  <q-icon name="schedule" color="amber-5" size="16px" />
                  <span>Horário de Atendimento</span>
                </div>
                <div class="contact-val text-grey-2">
                  {{ officialContact.horario }}
                </div>
              </div>

              <q-btn
                unelevated
                color="positive"
                text-color="white"
                icon="chat"
                label="Falar no WhatsApp Oficial"
                class="full-width q-py-sm text-weight-bold rounded-borders"
                :href="whatsappUrl"
                target="_blank"
              />
            </div>
          </div>

          <!-- Coluna do Formulário Único -->
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
                      v-model="contactForm.email"
                      label="Endereço de Email"
                      dark
                      outlined
                      dense
                      type="email"
                    />
                  </div>
                </div>

                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="contactForm.phone"
                      label="Telefone / WhatsApp *"
                      dark
                      outlined
                      dense
                      placeholder="84 272 4906"
                      :rules="[val => !!val || 'Informe o seu número']"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model.number="contactForm.amount"
                      label="Valor Pretendido (MZN)"
                      dark
                      outlined
                      dense
                      type="number"
                    />
                  </div>
                </div>

                <q-input
                  v-model="contactForm.message"
                  label="Mensagem / Observações *"
                  dark
                  outlined
                  dense
                  type="textarea"
                  rows="4"
                  :rules="[val => !!val || 'Escreva a sua mensagem']"
                />

                <q-btn
                  type="submit"
                  unelevated
                  color="amber-6"
                  text-color="dark"
                  icon="send"
                  label="Enviar Proposta"
                  size="md"
                  class="full-width q-py-sm text-weight-bold rounded-borders"
                  :loading="submittingLead"
                />
              </q-form>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- 11. FOOTER ÚNICO                                               -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <footer class="site-footer">
      <div class="container footer-container">
        <div class="row q-col-gutter-xl q-pb-lg">
          <!-- Coluna 1: Marca & Síntese Legal -->
          <div class="col-12 col-md-5">
            <div class="row items-center q-mb-sm">
              <div class="brand-logo-badge q-mr-sm">
                <q-icon name="account_balance" size="22px" color="white" />
              </div>
              <span class="text-h6 text-weight-bold text-white">Clack Microcrédito, EI</span>
            </div>
            <p class="text-caption text-grey-4 line-height-relaxed q-mb-sm">
              Instituição moçambicana de microcrédito voltada ao fomento do empreendedorismo local,
              liquidez para pequenos negócios e soluções financeiras familiares transparentes.
            </p>
            <div class="text-caption text-grey-4">
              <q-icon name="gavel" size="14px" class="q-mr-xs text-amber-5" />
              Entidade licenciada em conformidade com o regime financeiro de Moçambique.
            </div>
          </div>

          <!-- Coluna 2: Links Rápidos -->
          <div class="col-12 col-sm-6 col-md-3">
            <h4 class="footer-col-title text-white">Links Rápidos</h4>
            <ul class="footer-links-list">
              <li><a href="#inicio">Início</a></li>
              <li><a href="#simulador">Simulador de Crédito</a></li>
              <li><a href="#produtos">Produtos & Modalidades</a></li>
              <li><a href="#sobre">Sobre a Clack</a></li>
              <li><a href="#porque-clack">Porquê a Clack?</a></li>
              <li><a href="#como-funciona">Como Funciona</a></li>
              <li><a href="#faq">Perguntas Frequentes</a></li>
              <li><a href="#contacto">Contacto</a></li>
            </ul>
          </div>

          <!-- Coluna 3: Contactos Sucintos e Área Reservada -->
          <div class="col-12 col-sm-6 col-md-4">
            <h4 class="footer-col-title text-white">Contactos Oficiais</h4>
            <div class="text-caption text-grey-4 column q-gutter-xs q-mb-md">
              <div><strong>Email:</strong> {{ officialContact.email }}</div>
              <div><strong>Telefone:</strong> {{ officialContact.phone }}</div>
              <div><strong>Endereço:</strong> {{ officialContact.address }}</div>
              <div><strong>Horário:</strong> {{ officialContact.horario }}</div>
            </div>

            <q-btn
              outline
              color="amber-5"
              text-color="white"
              icon="lock"
              label="Aceder ao Sistema"
              class="full-width q-py-xs rounded-borders"
              :href="systemUrl"
              no-caps
            />
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
    <!-- MODAL DE PROPOSTA ONLINE                                       -->
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
            <div class="row justify-between q-py-xs">
              <span>Modalidade:</span>
              <strong class="text-amber-4">{{ selectedProduct?.title }}</strong>
            </div>
            <div class="row justify-between q-py-xs">
              <span>Capital Financiado:</span>
              <strong class="text-white">{{ formatMoney(simAmount) }}</strong>
            </div>
            <div class="row justify-between q-py-xs">
              <span>Prazo de Reembolso:</span>
              <strong class="text-white">{{ simTerm }} Meses</strong>
            </div>
            <div class="row justify-between q-py-xs">
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
              placeholder="Ex: 84 272 4906"
              :rules="[val => !!val || 'Informe o seu número']"
            />
            <q-input
              v-model="modalForm.email"
              label="Email (Opcional)"
              dark
              outlined
              dense
              type="email"
            />
            <q-input
              v-model="modalForm.message"
              label="Observações / Finalidade do Crédito"
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
                class="rounded-borders font-weight-bold"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- APENAS 1 BOTÃO FLUTUANTE DE WHATSAPP (CANTO INFERIOR DIREITO)  -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <a :href="whatsappUrl" target="_blank" class="floating-whatsapp-btn" title="Falar no WhatsApp Oficial">
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

// DADOS OFICIAIS REATIVOS (DINÂMICOS DA BASE DE DADOS)
const officialContact = ref({
  email: 'zualofrancisco202@gmail.com',
  phone: '258842724906',
  whatsappRaw: '258842724906',
  whatsappDisplay: '+258 84 272 4906',
  address: 'Bairro de Incassane, Q. 3, Casa 4, Distrito Municipal Katembe - Cidade de Maputo - Moçambique',
  horario: 'Segunda a Sexta: 08:00 - 17:00 | Sábado: 08:00 - 12:30'
})

const cleanPhone = (val) => {
  if (!val) return ''
  return String(val).replace(/[^\d+]/g, '')
}

// PRODUTOS DE CRÉDITO (EXATAMENTE 3 CARDS CONFORME ESPECIFICAÇÃO)
const availableProducts = ref([
  {
    slug: 'credito-negocio',
    title: 'Crédito Negócio & PME',
    badge: 'Mais Procurado',
    summary: 'Capital de giro para reforço de estoque, mercadorias, insumos ou expansão do comércio.',
    minAmount: 5000,
    maxAmount: 300000,
    minTerm: 1,
    maxTerm: 6,
    interestRate: 15.0,
    requirements: 'BI ou DIRE válido\nComprovativo de atividade comercial\nExtrato bancário ou M-Pesa dos últimos 3 meses',
    icon: 'storefront',
    featured: true
  },
  {
    slug: 'credito-pessoal',
    title: 'Crédito Pessoal & Família',
    badge: 'Rápido & Prático',
    summary: 'Financiamento direto para despesas familiares, propinas escolares, pequenas reformas ou imprevistos.',
    minAmount: 2000,
    maxAmount: 100000,
    minTerm: 1,
    maxTerm: 4,
    interestRate: 15.0,
    requirements: 'BI ou DIRE válido\nNUIT pessoal\nComprovativo de residência atualizado',
    icon: 'account_balance_wallet',
    featured: false
  },
  {
    slug: 'credito-funcionario',
    title: 'Crédito Funcionário / Salário',
    badge: 'Taxa Preferencial',
    summary: 'Crédito com taxa reduzida para funcionários públicos e do setor privado com rendimento comprovado.',
    minAmount: 3000,
    maxAmount: 150000,
    minTerm: 1,
    maxTerm: 6,
    interestRate: 12.0,
    requirements: 'BI e NUIT\nDeclaração de serviço / Vínculo laboral recente\nÚltimos 3 recibos de vencimento\nExtrato bancário de 3 meses',
    icon: 'badge',
    featured: false
  }
])

// FAQS OFICIAIS
const faqsList = ref([
  {
    question: 'Quem pode solicitar crédito na Clack Microcrédito?',
    answer: 'Cidadãos moçambicanos ou residentes legais com idade igual ou superior a 21 anos, com documento válido (BI ou DIRE) e que comprovem atividade produtiva, comercial ou vínculo laboral.'
  },
  {
    question: 'Quanto tempo demora a aprovação e o desembolso?',
    answer: 'A análise da documentação é feita em até 24 horas úteis. Uma vez aprovada e assinada a proposta, o desembolso é efetuado de imediato na sua conta bancária ou via M-Pesa.'
  },
  {
    question: 'Como faço para pagar as prestações mensais?',
    answer: 'Pode pagar comodamente através de M-Pesa, e-Mola ou transferência bancária (BCI, Millennium BIM, Standard Bank, Moza Banco).'
  },
  {
    question: 'Qual é a taxa de juro aplicada?',
    answer: 'As taxas são transparentes, variando a partir de 12% a.m. para funcionários e 15% a.m. para negócios e consumo pessoal, sem taxas ocultas.'
  },
  {
    question: 'É necessária hipoteca de imóvel?',
    answer: 'Não. Não exigimos hipotecas de bens imóveis para as nossas linhas padrão de microcrédito.'
  }
])

// ESTADO DO SIMULADOR ÚNICO (CRÉDITO CLACK)
const selectedProduct = ref(availableProducts.value[0])
const simAmount = ref(20000)
const simTerm = ref(3)

// Formulário de Contacto Principal
const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  amount: 20000,
  message: ''
})

// Formulário do Modal de Proposta
const modalForm = ref({
  name: '',
  phone: '',
  email: '',
  message: ''
})

// URL do Sistema de Gestão
const systemUrl = computed(() => {
  const host = window.location.hostname
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return '/login'
  }
  return 'https://web.clackmicrocredito.com/login'
})

// Link WhatsApp Oficial Único
const whatsappUrl = computed(() => {
  const num = officialContact.value.whatsappRaw
  const text = encodeURIComponent(
    'Olá! Gostaria de informações sobre solicitação de crédito na Clack Microcrédito, EI.'
  )
  return `https://wa.me/${num}?text=${text}`
})

// Cálculos do Simulador Único
const simInterestRate = computed(() => {
  return Number(selectedProduct.value?.interestRate || 15)
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

// Formatação Monetária em Meticais (MZN)
const formatMoney = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0,00 MZN'
  return Number(val).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

// Separador de Linhas
const splitLines = (text) => {
  if (!text) return []
  return text.split(/\r?\n/).filter(line => line.trim().length > 0)
}

// Seleção de Produto no Simulador
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
  scrollTo('#simulador')
}

// Scroll Suave para Secções
const scrollTo = (target) => {
  mobileDrawer.value = false
  const el = document.querySelector(target)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

const navigateTo = (target) => {
  scrollTo(target)
}

// Enviar Simulação via WhatsApp (Botão Verde do Simulador Único)
const sendWhatsAppSimulation = () => {
  const num = officialContact.value.whatsappRaw
  const prodTitle = selectedProduct.value?.title || 'Crédito Clack'
  const msg =
    `Olá Clack Microcrédito! Fiz uma simulação no website e gostaria de solicitar este crédito:\n\n` +
    `• Linha: ${prodTitle}\n` +
    `• Capital Financiado: ${formatMoney(simAmount.value)}\n` +
    `• Prazo: ${simTerm.value} ${simTerm.value === 1 ? 'mês' : 'meses'}\n` +
    `• Taxa Aplicada: ${simInterestRate.value}% a.m.\n` +
    `• Prestação Mensal Estimada: ${formatMoney(simMonthlyPayment.value)}/mês\n` +
    `• Total a Reembolsar: ${formatMoney(simTotalPayment.value)}\n\n` +
    `Como posso proceder com o envio da documentação?`
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
}

// Abrir Modal de Candidatura Online (Botão Amarelo/Dourado do Simulador Único)
const openLeadModal = () => {
  modalForm.value.name = contactForm.value.name || ''
  modalForm.value.phone = contactForm.value.phone || ''
  modalForm.value.email = contactForm.value.email || ''
  leadModalOpen.value = true
}

// Submeter Pedido pelo Formulário de Contacto Único
const submitContactLead = async () => {
  submittingLead.value = true
  try {
    const payload = {
      name: contactForm.value.name,
      phone: contactForm.value.phone,
      email: contactForm.value.email || null,
      amount: contactForm.value.amount || simAmount.value,
      term: simTerm.value,
      productSlug: selectedProduct.value?.slug || 'credito-negocio',
      message: contactForm.value.message,
      source: 'WEBSITE_CONTACT_FORM'
    }

    const res = await axios.post('/api/public/site/lead', payload)
    if (res.data?.success) {
      $q.notify({
        type: 'positive',
        message: 'Proposta submetida com sucesso! A nossa equipa entrará em contacto brevemente.',
        position: 'top',
        timeout: 5000
      })
      contactForm.value.name = ''
      contactForm.value.email = ''
      contactForm.value.phone = ''
      contactForm.value.message = ''
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível enviar a proposta no momento. Por favor use o WhatsApp oficial.',
      position: 'top'
    })
  } finally {
    submittingLead.value = false
  }
}

// Submeter Pedido pelo Modal do Simulador
const submitModalLead = async () => {
  submittingLead.value = true
  try {
    const payload = {
      name: modalForm.value.name,
      phone: modalForm.value.phone,
      email: modalForm.value.email || null,
      amount: simAmount.value,
      term: simTerm.value,
      productSlug: selectedProduct.value?.slug || 'credito-clack',
      message: modalForm.value.message || 'Pedido gerado através do simulador de crédito online.',
      source: 'WEBSITE_SIMULATOR_MODAL'
    }

    const res = await axios.post('/api/public/site/lead', payload)
    if (res.data?.success) {
      $q.notify({
        type: 'positive',
        message: 'Proposta enviada com sucesso! A equipa Clack Microcrédito entrará em contacto.',
        position: 'top',
        timeout: 5000
      })
      leadModalOpen.value = false
      modalForm.value.name = ''
      modalForm.value.phone = ''
      modalForm.value.message = ''
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Erro ao enviar proposta. Pode enviar diretamente pelo WhatsApp oficial.',
      position: 'top'
    })
  } finally {
    submittingLead.value = false
  }
}

// Efeito de Scroll no Topo
const handleScroll = () => {
  isScrolled.value = window.scrollY > 40
}

// Carregar dados dinâmicos da base de dados via API pública
const loadSiteData = async () => {
  try {
    const res = await axios.get('/api/public/site/content')
    if (res.data?.success) {
      const cfg = res.data.config || {}
      if (cfg.email) officialContact.value.email = cfg.email
      if (cfg.address) officialContact.value.address = cfg.address
      if (cfg.workingHours) officialContact.value.horario = cfg.workingHours
      if (cfg.phone) {
        officialContact.value.phone = cfg.phone
        const raw = String(cfg.phone).replace(/\D/g, '')
        officialContact.value.whatsappRaw = raw.startsWith('258') ? raw : '258' + raw
        officialContact.value.whatsappDisplay = cfg.phone
      }
      if (cfg.whatsapp) {
        const rawW = String(cfg.whatsapp).replace(/\D/g, '')
        officialContact.value.whatsappRaw = rawW.startsWith('258') ? rawW : '258' + rawW
      }

      if (res.data.products && Array.isArray(res.data.products) && res.data.products.length > 0) {
        availableProducts.value = res.data.products.map(p => ({
          ...p,
          interestRate: Number(p.interestRate || 15)
        }))
        selectedProduct.value = availableProducts.value[0]
      }

      if (res.data.faqs && Array.isArray(res.data.faqs) && res.data.faqs.length > 0) {
        faqsList.value = res.data.faqs
      }
    }
  } catch (err) {
    console.warn('[InstitutionalWebsite] Erro ao carregar dados dinâmicos da API:', err)
  }
}

onMounted(() => {
  loadSiteData()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ── PALETA INSTITUCIONAL CLACK MICROCRÉDITO ── */
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

/* ── HEADER & NAVBAR ÚNICA ── */
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
  padding: 7px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
  border-radius: 10px;
  font-weight: 600;
}

/* ── HERO SECTION ── */
.hero-section {
  position: relative;
  background: linear-gradient(135deg, #071527 0%, #0b1f3a 50%, #12345e 100%);
  padding: 170px 0 110px;
  overflow: hidden;
}
.hero-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.08) 0%, transparent 60%);
  pointer-events: none;
}
.hero-container {
  position: relative;
  z-index: 2;
}
.hero-content-wrapper {
  max-width: 820px;
  margin: 0 auto;
}
.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.16;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}
.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.6;
  margin: 0 auto 30px;
  color: #cbd5e1;
}
.hero-btn-primary {
  border-radius: 12px;
  padding: 12px 28px;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
}
.hero-btn-secondary {
  border-radius: 12px;
  padding: 12px 28px;
}

/* ── SIMULADOR ÚNICO ── */
.simulator-main-box {
  background: rgba(15, 43, 78, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.45);
}
.sim-ctrl-label {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
}
.amount-input-box {
  display: flex;
  align-items: center;
  background: rgba(7, 21, 39, 0.85);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 8px;
  padding: 4px 12px;
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
  background: rgba(7, 21, 39, 0.88);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 20px;
  padding: 26px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.result-highlight-box {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 14px;
}

/* ── SECTION PADRÃO ── */
.section-padding {
  padding: 85px 0;
}
.section-heading {
  margin-bottom: 45px;
}
.section-tag {
  display: inline-block;
  padding: 4px 14px;
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

/* ── PRODUTOS ── */
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
  transform: translateY(-4px);
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
  padding: 3px 12px;
  border-radius: 12px;
  text-transform: uppercase;
}
.product-icon-wrap {
  width: 52px;
  height: 52px;
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
.product-bullets {
  line-height: 1.5;
}
.select-prod-btn {
  border-radius: 10px;
  font-weight: 600;
}

/* ── SOBRE NÓS ── */
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
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.pillar-title {
  font-size: 1.05rem;
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

/* ── PORQUÊ A CLACK? ── */
.why-card {
  background: rgba(15, 43, 78, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 28px 22px;
  height: 100%;
  text-align: center;
  transition: transform 0.2s;
}
.why-card:hover {
  transform: translateY(-4px);
}
.why-icon-box {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.why-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 10px;
}
.why-desc {
  font-size: 0.88rem;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

/* ── COMO FUNCIONA ── */
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
  width: 68px;
  height: 68px;
  border-radius: 18px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}
.step-text {
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
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

/* ── CONTACTO ÚNICO ── */
.official-contact-box {
  background: rgba(15, 43, 78, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 30px;
}
.contact-entry {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 10px;
}
.contact-val {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 3px;
  text-decoration: none;
  line-height: 1.45;
}
.lead-form-box {
  background: rgba(15, 43, 78, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 32px;
}
.form-title {
  font-size: 1.4rem;
  font-weight: 700;
}

/* ── FOOTER ÚNICO ── */
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

/* ── APENAS 1 BOTÃO FLUTUANTE DE WHATSAPP ── */
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
  transform: scale(1.08);
}

.lead-modal-card {
  width: 500px;
  max-width: 90vw;
  border-radius: 18px;
}
.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.rounded-borders {
  border-radius: 10px;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.1rem;
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
