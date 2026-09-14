<template>
  <!-- ============================================================
       LANDING PAGE OFICIAL — MAIS MOLA (design Meta AI)
       Rota: / (pública). O login continua em /login.
       Estrutura: Header → Hero → Problema → Funcionalidades →
       Como Funciona → Caixa Central → Preços → FAQ → CTA → Footer
       ============================================================ -->
  <div class="landing">

    <!-- ===================== HEADER (branco, sticky) ===================== -->
    <!-- Navbar sempre visível: sticky, nunca some ao rolar. Ganha sombra + blur quando scrollY > 50 -->
    <header class="site-header" :class="{ scrolled }">
      <div class="header-inner">
        <a class="brand" href="#" @click.prevent="scrollTop">
          <span class="brand-mark">M</span>
          <span class="brand-text">
            <b>Mais Mola</b>
            <small>GESTÃO DE MICROCRÉDITO</small>
          </span>
        </a>
        <nav class="main-nav">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#como-funciona">Como Funciona</a>
          <a href="#precos">Preços</a>
          <a href="#contactos">Contactos</a>
        </nav>
        <div class="header-actions">
          <router-link class="btn-ghost" to="/login">Entrar</router-link>
          <router-link class="btn-dark" to="/registar-empresa">Experimente Grátis <span class="arrow">→</span></router-link>
        </div>
      </div>
    </header>

    <!-- ===================== HERO ===================== -->
    <section class="hero">
      <!-- hero entra com animação de carga (classe reveal aplicada via CSS animation) -->
      <div class="hero-inner">
        <!-- Texto -->
        <div class="hero-copy hero-enter">
          <span class="hero-badge">
            <span class="badge-check">✓</span>
            Aprovado para Relatórios do Banco de Moçambique
          </span>
          <h1>
            Transforme sua<br />
            <span class="hl">microcrédito</span><br />
            numa máquina de<br />
            lucro
          </h1>
          <p class="hero-sub">
            Centralize todo o ciclo do crédito — do pedido ao reembolso.
            Controlo total da carteira, redução de mora e relatórios do BM em 2 cliques.
          </p>
          <div class="hero-ctas">
            <router-link class="btn-emerald btn-lg" to="/registar-empresa">Começar Grátis 14 dias <span class="arrow">→</span></router-link>
            <a class="btn-glass btn-lg" href="#como-funciona"><span class="play">▶</span> Ver Demonstração</a>
          </div>
          <div class="hero-proof">
            <span class="avatars"><i>A</i><i>B</i><i>C</i></span>
            <span class="proof-text">
              <b>+120 instituições confiam</b>
              <small>Avaliação 4.9/5 no WhatsApp</small>
            </span>
          </div>
        </div>

        <!-- Mockup do dashboard -->
        <div class="hero-visual hero-enter-delayed">
          <div class="dash">
            <div class="dash-bar">
              <span class="dots"><i class="r"></i><i class="y"></i><i class="g"></i></span>
              <span class="dash-title">MAIS MOLA • DASHBOARD</span>
              <span class="dash-avatar"></span>
            </div>
            <div class="dash-body">
              <div class="dash-head">
                <b>Visão Geral da Carteira</b>
                <span class="chip-mini">Hoje • Maputo</span>
              </div>
              <div class="dash-stats">
                <div class="stat">
                  <small>CARTEIRA ATIVA</small>
                  <b>8.4M MZN</b>
                  <em class="up">+12%</em>
                </div>
                <div class="stat">
                  <small>TAXA DE MORA</small>
                  <b>3.2%</b>
                  <em class="down">-0.8%</em>
                </div>
                <div class="stat">
                  <small>CLIENTES</small>
                  <b>342</b>
                  <em class="up">+18</em>
                </div>
              </div>
              <div class="dash-list">
                <div class="dash-list-head">
                  <b>Prestações - Próximos 7 dias</b>
                  <small>Alerta automático SMS</small>
                </div>
                <div class="pay-row">
                  <span class="pay-avatar">A</span>
                  <span class="pay-info"><b>Ana Massingue</b><small>Hoje</small></span>
                  <span class="pay-val"><b>1.500 MZN</b><em class="pend">PENDENTE</em></span>
                </div>
                <div class="pay-row">
                  <span class="pay-avatar">J</span>
                  <span class="pay-info"><b>João Cossa</b><small>Amanhã</small></span>
                  <span class="pay-val"><b>3.200 MZN</b><em class="late">ATRASO</em></span>
                </div>
                <div class="pay-row">
                  <span class="pay-avatar">F</span>
                  <span class="pay-info"><b>Fatima Abdula</b><small>15 Nov</small></span>
                  <span class="pay-val"><b>900 MZN</b><em class="paid">PAGO</em></span>
                </div>
              </div>
              <div class="dash-footer">
                <div class="cash-tile">
                  <small>CAIXA CENTRAL</small>
                  <b>FNB • BCI • BIM</b>
                  <span class="bank-ico">🏦</span>
                </div>
                <div class="bm-tile">
                  <small>RELATÓRIO BM</small>
                  <b>📄 Pronto para exportar</b>
                </div>
              </div>
            </div>
          </div>
          <!-- Chip flutuante -->
          <div class="float-chip">
            <span class="chip-ico">📈</span>
            <span><small>RECUPERAÇÃO</small><b>+27% este mês</b></span>
          </div>
        </div>
      </div>
      <!-- Faixa de confiança -->
      <div class="trust-strip">
        <span class="trust-label">USADO POR MICROCRÉDITOS EM</span>
        <span class="trust-cities"><i>●</i> Maputo <i>●</i> Matola <i>●</i> Beira <i>●</i> Nampula • Chimoio</span>
      </div>
    </section>

    <!-- ===================== O PROBLEMA ===================== -->
    <section class="section problem">
      <div class="container">
        <div v-reveal class="center-head">
          <span class="tag">O PROBLEMA ATUAL</span>
          <h2>Planilhas não aguentam o crescimento</h2>
          <p>Vimos de perto os mesmos 3 gargalos que travam 9 em cada 10 microcréditos em Moçambique.</p>
        </div>
        <div class="problem-grid">
          <div v-reveal="0" class="p-card">
            <span class="p-ico yellow">📒</span>
            <h3>Excel desorganizado</h3>
            <p>Várias versões, fórmulas quebradas, clientes duplicados. Perde-se 6h por semana só a consolidar.</p>
            <span class="chip-before">✕ Antes</span>
          </div>
          <div v-reveal="120" class="p-card">
            <span class="p-ico red">⚠️</span>
            <h3>Mora alta sem alerta</h3>
            <p>Sem SMS/WhatsApp automático, 40% dos atrasos só são notados depois de 7 dias. Dinheiro parado.</p>
            <span class="chip-before">✕ Antes</span>
          </div>
          <div v-reveal="240" class="p-card">
            <span class="p-ico blue">🕐</span>
            <h3>Relatório BM demora dias</h3>
            <p>Fechar o mapa do Banco de Moçambique leva 2-3 dias. Risco de multa por atraso ou erro.</p>
            <span class="chip-before">✕ Antes</span>
          </div>
        </div>
        <!-- Banner solução -->
        <div v-reveal="150" class="solution-banner">
          <span class="sol-ico">🛡️</span>
          <div>
            <b>Com Mais Mola, tudo centralizado e auditável</b>
            <p>Um único lugar para clientes, créditos, prestações, caixa e relatórios. Reduza a mora em até 35% com alertas automáticos.</p>
          </div>
          <span class="sol-chip">✓ Migração do Excel em 1 dia</span>
        </div>
      </div>
    </section>

    <!-- ===================== FUNCIONALIDADES ===================== -->
    <section id="funcionalidades" class="section features">
      <div class="container">
        <span v-reveal class="tag">FUNCIONALIDADES</span>
        <div v-reveal class="features-head">
          <h2>Tudo o que precisa para crescer com segurança</h2>
          <p>Desenhado para a realidade moçambicana: dinheiro móvel, múltiplas contas bancárias e relatórios do Banco de Moçambique.</p>
        </div>
        <div class="features-grid">
          <div v-for="(f, fi) in features" :key="f.title" v-reveal="fi * 90" class="f-card">
            <span class="f-ico">{{ f.icon }}</span>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== COMO FUNCIONA ===================== -->
    <section id="como-funciona" class="section steps-section">
      <div class="container">
        <span v-reveal class="tag">COMO FUNCIONA</span>
        <h2 v-reveal class="steps-title">De Excel caótico a operação profissional em 4 passos</h2>
        <div class="steps-grid">
          <div v-for="(s, i) in steps" :key="s.title" v-reveal="i * 110" class="step-card">
            <span class="step-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== CAIXA CENTRAL (NOVIDADE) ===================== -->
    <section class="section cash-section">
      <div class="container cash-grid">
        <div v-reveal class="cash-copy">
          <span class="tag tag-dark"><i class="dot-live"></i> NOVIDADE</span>
          <h2>Caixa Central que reflete suas contas bancárias reais</h2>
          <p>
            Em Moçambique 90% do dinheiro já é electrónico. O Mais Mola reconcilia automaticamente
            movimentos do FNB, BCI, BIM, Millennium, M-Pesa e e-Mola. Sem digitação dupla,
            sem erro humano. Caixa fechada todos os dias em 5 minutos.
          </p>
          <ul class="cash-checks">
            <li v-for="c in cashChecks" :key="c"><span class="check">✓</span> {{ c }}</li>
          </ul>
        </div>
        <!-- Card de contas (mockup) -->
        <div v-reveal="180" class="cash-card">
          <div class="cash-card-head">
            <b>Caixa Central</b>
            <span class="chip-sync">Sincronizado</span>
          </div>
          <div class="acc-row" v-for="a in cashAccounts" :key="a.name">
            <span class="acc-ico">▭</span>
            <span class="acc-name">{{ a.name }}</span>
            <span class="acc-val">
              <b>{{ a.balance }} MZN</b>
              <em>{{ a.today }} hoje</em>
            </span>
          </div>
          <div class="cash-total">
            <span>Total consolidado</span>
            <b>4.910.700 MZN</b>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== PREÇOS ===================== -->
    <section id="precos" class="section pricing">
      <div class="container">
        <div v-reveal class="center-head">
          <span class="tag">PREÇOS TRANSPARENTES</span>
          <h2>Comece pequeno, cresça sem trocar de sistema</h2>
          <p>Todos os planos incluem 14 dias grátis, sem fidelidade, suporte via WhatsApp.</p>
        </div>
        <!-- Planos dinâmicos: vêm de GET /api/subscription-plans?is_active=1 -->
        <div class="pricing-grid">
          <div v-for="(p, pi) in dynamicPlans" :key="p.id" v-reveal="pi * 120" class="price-card" :class="{ popular: Number(p.is_popular) === 1 }">
            <span v-if="Number(p.is_popular) === 1" class="popular-badge">MAIS POPULAR</span>
            <h3>{{ p.name }}</h3>
            <small>Até {{ Number(p.max_clients) >= 999999 ? 'clientes ilimitados' : Number(p.max_clients) + ' clientes' }}</small>
            <div class="price">{{ formatPrice(p.price_mzn) }}<span> MZN / mês</span></div>
            <ul>
              <li v-for="f in parseFeatures(p.features)" :key="f"><span class="check">✓</span> {{ f }}</li>
            </ul>
            <router-link class="btn-dark btn-block" :class="{ 'btn-emerald': Number(p.is_popular) === 1 }" to="/registar-empresa">Começar Grátis 14 dias</router-link>
            <small class="fine" :class="{ light: Number(p.is_popular) === 1 }">Sem cartão • Cancele quando quiser</small>
          </div>

          <!-- Fallback estático caso a API falhe -->
          <div v-if="dynamicPlans.length === 0 && plansFailed" v-reveal class="price-card popular">
            <span class="popular-badge">MAIS POPULAR</span>
            <h3>Crescimento</h3>
            <small>Até 500 clientes</small>
            <div class="price">4.500<span> MZN / mês</span></div>
            <ul><li><span class="check">✓</span> Tudo do Starter</li><li><span class="check">✓</span> Caixa Multi-contas</li></ul>
            <router-link class="btn-emerald btn-block" to="/registar-empresa">Começar Grátis 14 dias</router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== FAQ ===================== -->
    <section class="section faq-section">
      <div class="container faq-grid">
        <div v-reveal class="faq-copy">
          <span class="tag">FAQ</span>
          <h2>Perguntas frequentes</h2>
          <p>Tire suas dúvidas. Se precisar, fale direto no WhatsApp, respondemos em minutos.</p>
          <a class="btn-dark btn-wa" href="https://wa.me/258870740202" target="_blank" rel="noopener">
            <span class="wa">✆</span> Falar no WhatsApp
          </a>
        </div>
        <div class="faq-list">
          <details v-for="(f, fi) in faq" :key="f.q" v-reveal="fi * 80" class="faq-item" open>
            <summary>{{ f.q }} <span class="chev">⌄</span></summary>
            <p>{{ f.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- ===================== CTA FINAL ===================== -->
    <section class="section cta-section">
      <div class="container">
        <div v-reveal class="cta-banner">
          <div class="cta-copy">
            <h2>Pronto para organizar sua microcrédito hoje?</h2>
            <p>Junte-se a mais de 120 microcréditos em Maputo, Matola e Beira que já reduziram mora e fecham relatórios do BM em minutos.</p>
            <div class="cta-chips">
              <span>✓ 14 dias grátis</span>
              <span>✓ Sem fidelidade</span>
              <span>✓ Suporte no WhatsApp</span>
            </div>
          </div>
          <div class="cta-actions">
            <a class="btn-emerald btn-lg btn-block" href="https://wa.me/258870740202" target="_blank" rel="noopener">Começar Agora Grátis <span class="arrow">→</span></a>
            <a class="btn-white btn-lg btn-block" href="https://wa.me/258870740202" target="_blank" rel="noopener">Agendar Demonstração 15min</a>
            <small>Integração em 1 dia • Sem cartão de crédito</small>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== FOOTER ===================== -->
    <footer id="contactos" class="footer">
      <div class="container footer-grid">
        <div v-reveal class="footer-brand-col">
          <div class="brand">
            <span class="brand-mark">M</span>
            <span class="brand-text">
              <b>Mais Mola</b>
              <small>GESTÃO DE MICROCRÉDITO</small>
            </span>
          </div>
          <p>
            Sistema profissional para microcréditos moçambicanos. Focado em controlo,
            redução de mora e compliance com o Banco de Moçambique.
          </p>
          <p class="addr">Bairro de Incassane - Q. 5 Casa 35<br />Katembe - Cidade de Maputo</p>
        </div>
        <div>
          <h4>CONTACTOS</h4>
          <a class="contact-row" :href="'tel:+258870740202'"><span class="c-ico">✆</span> +258 87 074 0202</a>
          <a class="contact-row" :href="'tel:+2588353816'"><span class="c-ico">📱</span> +258 83 538 16</a>
          <a class="contact-row" :href="'mailto:leonelmatsinhe@gmail.com'"><span class="c-ico">✉</span> leonelmatsinhe@gmail.com</a>
          <a class="btn-emerald btn-wa-sm" href="https://wa.me/258870740202" target="_blank" rel="noopener">✆ WhatsApp</a>
        </div>
        <div>
          <h4>PRODUTO</h4>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#como-funciona">Como Funciona</a>
          <a href="#precos">Preços</a>
          <router-link to="/login">Entrar no Sistema</router-link>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container footer-bottom-inner">
          <span>© {{ year }} Mais Mola. Todos direitos reservados. Feito em Maputo com ❤ para microcréditos moçambicanos.</span>
          <span class="stack">Aprovado BM</span>
        </div>
      </div>
    </footer>

    <!-- WhatsApp flutuante -->
    <a class="wa-float" href="https://wa.me/258870740202" target="_blank" rel="noopener" aria-label="WhatsApp">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.2L2 22l4.9-1.6A9.9 9.9 0 1 0 12.04 2zm5.8 14.1c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-3.2-.9-2.5-1.17-4.08-4.06-4.2-4.25-.13-.19-1-1.46-.93-2.77.06-1.3.75-1.93 1-2.2.26-.26.55-.32.73-.32h.53c.17 0 .4-.06.62.5.24.6.8 2.07.87 2.22.07.15.11.32.01.51-.1.2-.36.55-.6.8-.11.11-.24.2-.1.44.13.24.6 1.05 1.3 1.7.9.84 1.65 1.12 1.89 1.24.23.12.37.1.51-.06.14-.15.6-.72.76-.97.16-.24.32-.2.54-.12.21.08 1.36.66 1.6.78.23.12.39.18.44.28.05.1.05.6-.19 1.27z"/>
      </svg>
    </a>
  </div>
</template>

<script setup>
// ============================================================
// LandingPage — website oficial de vendas (rota pública /).
// Design fiel ao mockup: header branco, hero verde escuro com
// dashboard mockup, problema, funcionalidades, 4 passos,
// caixa central, preços, FAQ, CTA final e footer escuro.
// ============================================================
import { ref, onMounted, onBeforeUnmount } from 'vue'

// ---------- Transições de scroll (reveal) ----------
// Directiva v-reveal: elemento entra com fade+slide suave quando aparece no ecrã.
// Suporta valor de atraso (v-reveal="120") para efeito cascata entre cards.
const revealObserver = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
  : null

const vReveal = {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    if (revealObserver) revealObserver.observe(el)
    else el.classList.add('revealed')
  },
  unmounted(el) {
    if (revealObserver) revealObserver.unobserve(el)
  },
}

// ---------- SEO ----------
onMounted(() => {
  document.title = 'Mais Mola - Sistema de Microcrédito Aprovado Banco de Moçambique | Maputo'
  const desc = document.querySelector('meta[name="description"]')
  if (desc) {
    desc.setAttribute('content', 'Centralize todo o ciclo do crédito: carteira, prestações, alertas SMS/WhatsApp, Caixa Central multi-contas (FNB, BCI, BIM, M-Pesa, e-Mola) e relatório do Banco de Moçambique em PDF/Excel. 14 dias grátis.')
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// Header ganha sombra ao rolar (só depois de 50px — navbar sempre visível)
const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 50 }
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const year = new Date().getFullYear()

// ---------- Funcionalidades (6 cards) ----------
const features = [
  { icon: '👥', title: 'Acompanhamento integral',
    desc: 'Do pedido à liquidação: pendentes, aprovados, desembolsados, liquidados. Histórico completo de mutuários em 1 clique.' },
  { icon: '🔔', title: 'Prestações e alertas automáticos',
    desc: 'SMS e WhatsApp automáticos antes do vencimento, no dia e em atraso. Reduza mora sem ligar para cada cliente.' },
  { icon: '📊', title: 'Relatórios BM export PDF/Excel',
    desc: 'Mapas formatados conforme exigência do Banco de Moçambique. Exporte em PDF ou Excel pronto para submissão.' },
  { icon: '💳', title: 'Caixa Central + Multi-contas',
    desc: 'Novo! Caixa central que reflecte automaticamente FNB, BCI, BIM, Millennium e carteiras e-Mola, M-Pesa.' },
  { icon: '🔒', title: 'Acesso por perfis',
    desc: 'Admin, Gestor, Operador e Caixa com permissões diferentes. Auditoria completa de quem fez o quê.' },
  { icon: '📱', title: 'Portal do Mutuário',
    desc: 'Cliente consulta saldo, prestações e comprovativos no celular. Menos filas, mais transparência.' },
]

// ---------- Como funciona (4 passos) ----------
const steps = [
  { title: 'Cadastre Mutuário', desc: 'NUIT, contactos, garantias e histórico. Importe do Excel em minutos.' },
  { title: 'Aprove Crédito', desc: 'Simulação de juros, plano de prestações, aprovação com assinatura digital.' },
  { title: 'Controle Prestações', desc: 'Baixa automática, alertas SMS/WhatsApp, renegociação e mora calculada.' },
  { title: 'Receba e Relate', desc: 'Caixa reconciliada e relatórios BM prontos para o Banco de Moçambique.' },
]

// ---------- Caixa Central ----------
const cashChecks = [
  'Reconciliação automática', 'Saldo em tempo real',
  'Auditoria completa', 'Fecha caixa em 5 min',
]
const cashAccounts = [
  { name: 'FNB Moçambique', balance: '2.340.000', today: '+320k' },
  { name: 'BCI', balance: '890.500', today: '+45k' },
  { name: 'M-Pesa Empresas', balance: '1.120.000', today: '+210k' },
  { name: 'e-Mola', balance: '560.200', today: '+18k' },
]

// ---------- Planos dinâmicos (GET /api/subscription-plans) ----------
import { api } from '@/boot/axios'

const dynamicPlans = ref([])
const plansFailed = ref(false)
const formatPrice = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const parseFeatures = (raw) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/api/subscription-plans', { params: { is_active: 1 } })
    if (data.success) dynamicPlans.value = data.result || []
  } catch {
    plansFailed.value = true
  }
})

// ---------- FAQ ----------
const faq = [
  { q: 'Meus dados estão seguros?',
    a: 'Sim. Hospedagem com backup diário encriptado, acesso por perfil e logs de auditoria. Servidores com SSL e cópias redundantes. Seus dados nunca são partilhados.' },
  { q: 'Preciso de internet sempre?',
    a: 'A plataforma funciona 100% na nuvem — precisa de internet para usar. Como 90% do movimento é electrónico (M-Pesa, transferências), o sistema foi optimizado para conexões móveis e carrega rápido mesmo em 3G.' },
  { q: 'Vocês ajudam a migrar do Excel?',
    a: 'Sim — a migração inicial dos seus clientes e créditos a partir do Excel é gratuita em todos os planos, e normalmente fica pronta em 1 dia.' },
  { q: 'Como funciona o suporte?',
    a: 'Direto no WhatsApp (+258 87 074 0202) e chamadas, em português, com pessoas que conhecem a realidade dos microcréditos em Moçambique.' },
]
</script>

<style scoped>
/* ═══════════════════ BASE ═══════════════════ */
.landing {
  font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a; background: #e8eef5; overflow-x: hidden;
  scroll-behavior: smooth;
}

/* ---------- Transições de scroll (reveal) ---------- */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity .7s cubic-bezier(.22,.61,.36,1), transform .7s cubic-bezier(.22,.61,.36,1);
  will-change: opacity, transform;
}
.reveal.revealed { opacity: 1; transform: translateY(0); }

/* ---------- Entrada do hero (animação de carga) ---------- */
@keyframes heroIn {
  from { opacity: 0; transform: translateY(36px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero-enter { animation: heroIn .8s cubic-bezier(.22,.61,.36,1) both; }
.hero-enter-delayed { animation: heroIn .9s .18s cubic-bezier(.22,.61,.36,1) both; }

/* Respeitar utilizadores com preferência por menos movimento */
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  .hero-enter, .hero-enter-delayed { animation: none !important; }
  .landing { scroll-behavior: auto; }
}

.container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
.section { padding: 72px 0; }
h2 { font-size: 2.1rem; font-weight: 800; line-height: 1.15; margin: 0 0 12px; letter-spacing: -0.5px; }

/* Tags / badges de secção */
.tag {
  display: inline-block; background: #e7efe9; color: #0b3d2e;
  font-size: .68rem; font-weight: 800; letter-spacing: .12em;
  padding: 6px 14px; border-radius: 999px; margin-bottom: 14px;
}
.center-head { text-align: center; max-width: 680px; margin: 0 auto 44px; }
.center-head p { color: #5b6b62; font-size: 1rem; }

/* Botões */
.btn-dark, .btn-emerald, .btn-white, .btn-ghost, .btn-glass {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  text-decoration: none; font-weight: 700; font-size: .9rem;
  border-radius: 999px; padding: 11px 22px; cursor: pointer; border: none;
  transition: transform .15s ease, box-shadow .15s ease;
}
.btn-dark { background: #0b3d2e; color: #fff; }
.btn-dark:hover { background: #0e4d3a; }
.btn-emerald { background: #34d399; color: #06301f; box-shadow: 0 6px 20px rgba(52,211,153,.35); }
.btn-emerald:hover { background: #2ec98f; }
.btn-white { background: #fff; color: #0b3d2e; }
.btn-ghost { background: #fff; color: #0b3d2e; border: 1px solid #d8e4dc; padding: 10px 24px; }
.btn-glass { background: rgba(255,255,255,.12); color: #fff; border: 1px solid rgba(255,255,255,.25); }
.btn-lg { padding: 15px 30px; font-size: 1rem; }
.btn-block { width: 100%; }
.arrow { font-weight: 400; }
.play { font-size: .7rem; background: rgba(255,255,255,.2); border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
.check {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: #34d399; color: #06301f; font-size: .65rem; font-weight: 900; flex-shrink: 0;
}

/* ═══════════════════ HEADER ═══════════════════ */
/* Navbar SEMPRE visível: sticky + blur + sombra suave quando scrolled */
.site-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  background: rgba(255,255,255,0.92);
  transition: box-shadow .2s;
}
.site-header.scrolled { box-shadow: 0 2px 14px rgba(15,23,42,.12); }
.header-inner { max-width: 1180px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; gap: 32px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; cursor: pointer; }
.brand-mark {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #0b3d2e, #14532d);
  color: #34d399; font-weight: 900; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
}
.brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.brand-text b { color: #0b3d2e; font-size: 1.05rem; }
.brand-text small { color: #8aa397; font-size: .58rem; letter-spacing: .14em; }
.main-nav { display: flex; gap: 26px; margin-left: auto; }
.main-nav a { color: #37544a; text-decoration: none; font-size: .92rem; font-weight: 500; }
.main-nav a:hover { color: #0b3d2e; }
.header-actions { display: flex; gap: 10px; }

/* ═══════════════════ HERO ═══════════════════ */
.hero {
  background:
    radial-gradient(circle at 20% 20%, rgba(52,211,153,.12), transparent 40%),
    linear-gradient(120deg, #062e21 0%, #0b3d2e 45%, #14532d 100%);
  color: #fff; padding: 72px 0 0; margin-top: 62px; /* espaço para o navbar fixo */
}
.hero-inner {
  max-width: 1180px; margin: 0 auto; padding: 0 24px;
  display: grid; grid-template-columns: 1.02fr .98fr; gap: 48px; align-items: center;
}
.hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16);
  color: #d7ece1; font-size: .8rem; font-weight: 600;
  padding: 8px 16px; border-radius: 999px; margin-bottom: 22px;
}
.badge-check {
  width: 17px; height: 17px; border-radius: 50%; background: #34d399; color: #06301f;
  font-size: .6rem; font-weight: 900; display: inline-flex; align-items: center; justify-content: center;
}
.hero h1 { font-size: 3.1rem; font-weight: 900; line-height: 1.08; margin: 0 0 18px; letter-spacing: -1px; }
.hero h1 .hl { color: #7ee0b8; }
.hero-sub { color: #bcd9cb; font-size: 1.05rem; line-height: 1.65; max-width: 480px; margin: 0 0 26px; }
.hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 30px; }
.hero-proof { display: flex; align-items: center; gap: 12px; }
.avatars { display: flex; }
.avatars i {
  width: 30px; height: 30px; border-radius: 50%; background: #1b5e46; color: #a7e3c8;
  font-style: normal; font-size: .7rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #0b3d2e; margin-left: -8px;
}
.avatars i:first-child { margin-left: 0; }
.proof-text { display: flex; flex-direction: column; line-height: 1.25; }
.proof-text b { font-size: .9rem; }
.proof-text small { color: #9cc7b2; font-size: .78rem; }

/* Mockup dashboard */
.hero-visual { position: relative; }
.dash { background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 32px 70px rgba(0,0,0,.45); color: #0f172a; }
.dash-bar { display: flex; align-items: center; gap: 10px; background: #f6faf7; padding: 10px 16px; border-bottom: 1px solid #e8f0ea; }
.dots { display: flex; gap: 5px; }
.dots i { width: 10px; height: 10px; border-radius: 50%; }
.dots .r { background: #f87171; } .dots .y { background: #fbbf24; } .dots .g { background: #34d399; }
.dash-title { font-size: .62rem; letter-spacing: .12em; color: #94a3b8; font-weight: 700; margin: 0 auto; }
.dash-avatar { width: 20px; height: 20px; border-radius: 50%; background: #0b3d2e; }
.dash-body { padding: 18px; }
.dash-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.dash-head b { font-size: .95rem; color: #0b3d2e; }
.chip-mini { background: #eef5f0; border: 1px solid #dbe7de; color: #4b6b5c; border-radius: 999px; font-size: .68rem; padding: 4px 12px; }
.dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.stat { background: #f8fbf9; border: 1px solid #e8f0ea; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 3px; }
.stat small { color: #8aa397; font-size: .58rem; font-weight: 700; letter-spacing: .06em; }
.stat b { font-size: 1.05rem; color: #0f172a; }
.stat em { font-style: normal; font-size: .68rem; font-weight: 700; border-radius: 999px; padding: 1px 8px; width: fit-content; }
.stat em.up { background: #d9f7e8; color: #059669; }
.stat em.down { background: #fee2e2; color: #dc2626; }
.dash-list { background: #f8fbf9; border: 1px solid #e8f0ea; border-radius: 12px; padding: 12px; margin-bottom: 14px; }
.dash-list-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.dash-list-head b { font-size: .8rem; }
.dash-list-head small { color: #8aa397; font-size: .62rem; }
.pay-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #eef4ef; }
.pay-row:last-child { border-bottom: none; }
.pay-avatar {
  width: 28px; height: 28px; border-radius: 50%; background: #e2efe7; color: #0b3d2e;
  font-size: .7rem; font-weight: 800; display: flex; align-items: center; justify-content: center;
}
.pay-info { display: flex; flex-direction: column; line-height: 1.2; flex: 1; }
.pay-info b { font-size: .78rem; }
.pay-info small { color: #8aa397; font-size: .66rem; }
.pay-val { text-align: right; display: flex; flex-direction: column; line-height: 1.2; }
.pay-val b { font-size: .8rem; }
.pay-val em { font-style: normal; font-size: .6rem; font-weight: 800; letter-spacing: .04em; }
.pay-val em.pend { color: #d97706; } .pay-val em.late { color: #dc2626; } .pay-val em.paid { color: #059669; }
.dash-footer { display: grid; grid-template-columns: 1.1fr .9fr; gap: 10px; }
.cash-tile { background: #0b3d2e; color: #fff; border-radius: 12px; padding: 12px; position: relative; }
.cash-tile small { color: #9cc7b2; font-size: .58rem; letter-spacing: .08em; display: block; }
.cash-tile b { font-size: .85rem; }
.bank-ico { position: absolute; right: 12px; top: 12px; font-size: .9rem; }
.bm-tile { background: #f8fbf9; border: 1px solid #e8f0ea; border-radius: 12px; padding: 12px; }
.bm-tile small { color: #8aa397; font-size: .58rem; letter-spacing: .08em; display: block; }
.bm-tile b { color: #0b3d2e; font-size: .8rem; }
.float-chip {
  position: absolute; left: -34px; bottom: 26px;
  background: #fff; border-radius: 14px; box-shadow: 0 14px 34px rgba(0,0,0,.25);
  padding: 10px 16px; display: flex; align-items: center; gap: 10px;
}
.chip-ico {
  width: 34px; height: 34px; border-radius: 50%; background: #d9f7e8;
  display: flex; align-items: center; justify-content: center; font-size: .9rem;
}
.float-chip small { display: block; color: #8aa397; font-size: .58rem; letter-spacing: .08em; }
.float-chip b { color: #059669; font-size: .95rem; }

/* Faixa de confiança */
.trust-strip {
  border-top: 1px solid rgba(255,255,255,.1);
  max-width: 1180px; margin: 56px auto 0; padding: 18px 24px;
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
}
.trust-label { color: #7ea995; font-size: .68rem; font-weight: 800; letter-spacing: .14em; }
.trust-cities { color: #d7ece1; font-size: .85rem; }
.trust-cities i { color: #34d399; font-style: normal; font-size: .5rem; vertical-align: middle; margin: 0 4px; }

/* ═══════════════════ PROBLEMA ═══════════════════ */
.problem { background: #e8eef5; }
.problem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 28px; }
.p-card { background: #fff; border-radius: 16px; padding: 28px 24px; border: 1px solid #e8f0ea; transition: box-shadow .25s ease, transform .25s ease; }
.p-card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(11,61,46,.1); }
.p-ico { font-size: 1.3rem; width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
.p-ico.yellow { background: #fef3c7; } .p-ico.red { background: #fee2e2; } .p-ico.blue { background: #dbeafe; }
.p-card h3 { font-size: 1.1rem; font-weight: 800; color: #0b3d2e; margin: 0 0 8px; }
.p-card p { color: #5b6b62; font-size: .9rem; line-height: 1.6; margin: 0 0 16px; }
.chip-before { background: #f1f5f3; color: #6b7f74; font-size: .72rem; font-weight: 700; border-radius: 999px; padding: 5px 12px; }
.solution-banner {
  background: linear-gradient(115deg, #0b3d2e, #14532d);
  border-radius: 18px; padding: 26px 30px; color: #fff;
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
}
.sol-ico {
  width: 46px; height: 46px; border-radius: 12px; background: #34d399;
  display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;
}
.solution-banner b { font-size: 1.05rem; display: block; margin-bottom: 4px; }
.solution-banner p { margin: 0; color: #bcd9cb; font-size: .88rem; max-width: 560px; }
.sol-chip {
  margin-left: auto; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2);
  border-radius: 999px; padding: 10px 18px; font-size: .8rem; font-weight: 700; color: #d7ece1;
}

/* ═══════════════════ FUNCIONALIDADES ═══════════════════ */
.features { background: #fff; }
.features-head { display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; align-items: end; margin-bottom: 36px; }
.features-head p { color: #5b6b62; margin: 0; line-height: 1.6; }
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.f-card { background: #f8fbf9; border: 1px solid #e8f0ea; border-radius: 16px; padding: 26px 22px; transition: transform .25s ease, box-shadow .25s ease; }
.f-card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(11,61,46,.1); }
.f-ico {
  width: 44px; height: 44px; border-radius: 12px; background: #fff;
  border: 1px solid #e8f0ea; display: flex; align-items: center; justify-content: center;
  font-size: 1.15rem; margin-bottom: 16px;
}
.f-card h3 { font-size: 1rem; font-weight: 800; color: #0b3d2e; margin: 0 0 8px; }
.f-card p { color: #5b6b62; font-size: .87rem; line-height: 1.6; margin: 0; }

/* ═══════════════════ COMO FUNCIONA ═══════════════════ */
.steps-section { background: #e8eef5; }
.steps-title { max-width: 720px; margin-bottom: 40px; }
.steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; position: relative; }
.step-card { background: #fff; border-radius: 16px; padding: 30px 22px; border: 1px solid #e8f0ea; position: relative; transition: transform .25s ease, box-shadow .25s ease; }
.step-card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(11,61,46,.1); }
.step-num {
  width: 42px; height: 42px; border-radius: 50%; background: #0b3d2e; color: #fff;
  font-weight: 800; font-size: .85rem; display: flex; align-items: center; justify-content: center;
  margin-bottom: 18px;
}
.step-card h3 { font-size: 1.02rem; font-weight: 800; color: #0b3d2e; margin: 0 0 8px; }
.step-card p { color: #5b6b62; font-size: .86rem; line-height: 1.6; margin: 0; }

/* ═══════════════════ CAIXA CENTRAL ═══════════════════ */
.cash-section {
  background:
    radial-gradient(circle at 80% 30%, rgba(52,211,153,.14), transparent 45%),
    linear-gradient(115deg, #062e21, #0b3d2e 55%, #14532d);
  color: #fff;
}
.cash-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 52px; align-items: center; }
.tag-dark { background: rgba(255,255,255,.1); color: #a7e3c8; border: 1px solid rgba(255,255,255,.2); }
.dot-live { width: 7px; height: 7px; border-radius: 50%; background: #34d399; display: inline-block; margin-right: 6px; animation: blink 1.6s infinite; }
@keyframes blink { 50% { opacity: .4; } }
.cash-copy h2 { color: #fff; font-size: 2.2rem; }
.cash-copy p { color: #bcd9cb; line-height: 1.7; margin-bottom: 22px; }
.cash-checks { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.cash-checks li { display: flex; align-items: center; gap: 9px; font-size: .9rem; color: #e6f4ec; }
.cash-card { background: #fff; border-radius: 18px; padding: 22px; color: #0f172a; box-shadow: 0 30px 60px rgba(0,0,0,.4); }
.cash-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.cash-card-head b { font-size: 1.05rem; color: #0b3d2e; }
.chip-sync { background: #d9f7e8; color: #059669; border-radius: 999px; font-size: .68rem; font-weight: 800; padding: 5px 14px; }
.acc-row {
  display: flex; align-items: center; gap: 12px;
  background: #f8fbf9; border: 1px solid #eef4ef; border-radius: 12px;
  padding: 12px 14px; margin-bottom: 9px;
}
.acc-ico {
  width: 32px; height: 32px; border-radius: 9px; background: #e2efe7; color: #0b3d2e;
  display: flex; align-items: center; justify-content: center; font-size: .85rem;
}
.acc-name { font-weight: 600; font-size: .9rem; flex: 1; }
.acc-val { text-align: right; display: flex; flex-direction: column; line-height: 1.25; }
.acc-val b { font-size: .92rem; }
.acc-val em { font-style: normal; color: #059669; font-size: .7rem; font-weight: 700; }
.cash-total {
  display: flex; align-items: center; justify-content: space-between;
  border-top: 1px solid #eef4ef; padding-top: 14px; margin-top: 4px;
}
.cash-total span { color: #6b7f74; font-size: .85rem; }
.cash-total b { font-size: 1.15rem; color: #0b3d2e; }

/* ═══════════════════ PREÇOS ═══════════════════ */
.pricing { background: #fff; }
.pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; max-width: 1020px; margin: 0 auto; align-items: stretch; }
.price-card {
  background: #fff; border: 1px solid #e8f0ea; border-radius: 20px;
  padding: 32px 26px; display: flex; flex-direction: column; position: relative;
  transition: transform .25s ease, box-shadow .25s ease;
}
.price-card:hover { transform: translateY(-5px); box-shadow: 0 18px 44px rgba(11,61,46,.12); }
.price-card.popular:hover { transform: translateY(-5px) scale(1.03); }
.price-card.popular { background: #0b3d2e; color: #fff; border-color: #0b3d2e; transform: scale(1.03); box-shadow: 0 24px 54px rgba(11,61,46,.35); z-index: 1; }
.popular-badge {
  position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
  background: #34d399; color: #06301f; font-size: .64rem; font-weight: 900; letter-spacing: .1em;
  padding: 6px 18px; border-radius: 999px;
}
.price-card h3 { font-size: 1.25rem; font-weight: 800; margin: 0 0 2px; color: #0b3d2e; }
.price-card.popular h3 { color: #fff; }
.price-card > small { color: #8aa397; margin-bottom: 20px; }
.price-card.popular > small { color: #9cc7b2; }
.price { font-size: 2.5rem; font-weight: 900; margin-bottom: 22px; color: #0f172a; }
.price-card.popular .price { color: #fff; }
.price span { font-size: .85rem; font-weight: 600; color: #8aa397; }
.price-card.popular .price span { color: #9cc7b2; }
.price-card ul { list-style: none; padding: 0; margin: 0 0 26px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.price-card li { display: flex; align-items: flex-start; gap: 9px; font-size: .88rem; color: #37544a; }
.price-card.popular li { color: #d7ece1; }
.fine { text-align: center; color: #8aa397; font-size: .72rem; margin-top: 12px; }
.fine.light { color: #9cc7b2; }

/* ═══════════════════ FAQ ═══════════════════ */
.faq-section { background: #e8eef5; }
.faq-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 48px; align-items: start; }
.faq-copy h2 { color: #0b3d2e; }
.faq-copy p { color: #5b6b62; margin-bottom: 22px; }
.btn-wa { padding: 12px 24px; }
.wa { font-size: 1rem; }
.faq-list { display: flex; flex-direction: column; gap: 12px; }
.faq-item {
  background: #fff; border: 1px solid #e8f0ea; border-radius: 14px; padding: 4px 22px;
  transition: box-shadow .25s ease;
}
.faq-item:hover { box-shadow: 0 8px 24px rgba(11,61,46,.08); }
.faq-item summary {
  list-style: none; cursor: pointer; font-weight: 700; font-size: .95rem; color: #0f172a;
  padding: 16px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.faq-item summary::-webkit-details-marker { display: none; }
.chev { color: #8aa397; transition: transform .2s; }
.faq-item[open] .chev { transform: rotate(180deg); }
.faq-item p {
  color: #5b6b62; font-size: .9rem; line-height: 1.65; margin: 0 0 18px;
  overflow: hidden;
}
.faq-item[open] p { animation: faqIn .3s ease; }
@keyframes faqIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

/* ═══════════════════ CTA FINAL ═══════════════════ */
.cta-section { background: #e8eef5; padding-top: 20px; }
.cta-banner {
  background:
    radial-gradient(circle at 85% 20%, rgba(52,211,153,.25), transparent 50%),
    linear-gradient(115deg, #0b3d2e, #14532d);
  border-radius: 24px; padding: 52px 56px; color: #fff;
  display: grid; grid-template-columns: 1.2fr 1fr; gap: 44px; align-items: center;
}
.cta-copy h2 { font-size: 2.3rem; margin-bottom: 12px; }
.cta-copy p { color: #bcd9cb; margin-bottom: 20px; line-height: 1.65; }
.cta-chips { display: flex; gap: 10px; flex-wrap: wrap; }
.cta-chips span {
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2);
  border-radius: 999px; padding: 6px 14px; font-size: .76rem; color: #d7ece1;
}
.cta-actions { display: flex; flex-direction: column; gap: 12px; }
.cta-actions small { text-align: center; color: #9cc7b2; font-size: .74rem; margin-top: 4px; }

/* ═══════════════════ FOOTER ═══════════════════ */
.footer { background: #08120d; color: #9fb3a8; padding: 60px 0 0; }
.footer-grid { display: grid; grid-template-columns: 1.4fr 1fr .8fr; gap: 44px; padding-bottom: 44px; }
.footer-brand-col p { font-size: .85rem; line-height: 1.7; margin: 14px 0 0; }
.footer-brand-col .addr { color: #6f8579; }
.footer h4 { color: #fff; font-size: .78rem; letter-spacing: .1em; margin: 4px 0 18px; }
.footer a { display: block; color: #9fb3a8; text-decoration: none; font-size: .88rem; margin-bottom: 12px; }
.footer a:hover { color: #7ee0b8; }
.contact-row { display: flex; align-items: center; gap: 10px; }
.c-ico {
  width: 28px; height: 28px; border-radius: 8px; background: #14251c;
  display: inline-flex; align-items: center; justify-content: center; font-size: .75rem; flex-shrink: 0;
}
.btn-wa-sm { display: inline-flex; margin-top: 8px; padding: 9px 20px; font-weight: 700; }
.footer-bottom { border-top: 1px solid rgba(255,255,255,.07); padding: 18px 0; }
.footer-bottom-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: .78rem; }
.stack { color: #6f8579; }

/* WhatsApp flutuante */
.wa-float {
  position: fixed; right: 22px; bottom: 22px; width: 54px; height: 54px;
  border-radius: 50%; background: #25d366; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(37,211,102,.45); z-index: 3000; transition: transform .2s;
}
.wa-float:hover { transform: scale(1.08); }

/* ═══════════════════ RESPONSIVO ═══════════════════ */
@media (max-width: 1023px) {
  .hero-inner, .cash-grid, .faq-grid, .cta-banner { grid-template-columns: 1fr; }
  .hero h1 { font-size: 2.4rem; }
  .hero-visual { max-width: 560px; margin: 0 auto; }
  .float-chip { left: 0; }
  .features-head { grid-template-columns: 1fr; align-items: start; }
  .problem-grid, .features-grid, .pricing-grid { grid-template-columns: repeat(2, 1fr); }
  .steps-grid { grid-template-columns: repeat(2, 1fr); gap: 26px 14px; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .price-card.popular { transform: none; }
  .main-nav { display: none; }
}
@media (max-width: 599px) {
  .section { padding: 52px 0; }
  .problem-grid, .features-grid, .pricing-grid, .steps-grid, .footer-grid { grid-template-columns: 1fr; }
  .hero h1 { font-size: 2rem; }
  .cta-banner { padding: 36px 26px; }
  .cta-copy h2 { font-size: 1.7rem; }
  .cash-checks { grid-template-columns: 1fr; }
  .header-inner { gap: 12px; }
  .header-actions .btn-ghost { padding: 10px 14px; }
  .header-actions .btn-dark { padding: 10px 14px; font-size: .8rem; }
}
</style>
