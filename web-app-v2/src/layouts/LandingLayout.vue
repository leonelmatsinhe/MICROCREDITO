<template>
  <div class="landing-layout mesh-bg">
    <!-- Orbs decorativos do fundo (mesh gradient) -->
    <div class="orb orb-lime" aria-hidden="true"></div>
    <div class="orb orb-green" aria-hidden="true"></div>

    <!-- ===================== NAVBAR GLASS ===================== -->
    <header class="glass-nav">
      <div class="nav-inner">
        <div class="brand row items-center no-wrap cursor-pointer" @click="goTop">
          <img src="@/assets/logo.png" alt="Mais Mola" width="36" height="36" class="brand-logo" />
          <div class="q-ml-sm gt-xs">
            <div class="brand-name">Mais Mola</div>
            <div class="brand-sub">Gestão de Microcrédito</div>
          </div>
        </div>

        <q-space />

        <nav class="nav-links gt-sm">
          <a v-for="item in menu" :key="item" href="#" class="nav-link" @click.prevent>{{ item }}</a>
        </nav>

        <q-btn
          unelevated
          color="green-10"
          text-color="white"
          rounded
          no-caps
          class="entrar-btn gt-sm q-ml-lg"
          label="Entrar"
          icon-right="arrow_forward"
          @click="goEntrar"
        />

        <q-btn flat round dense icon="menu" class="lt-md text-green-10" @click="mobileMenu = true" />
      </div>
    </header>

    <!-- Conteúdo da página -->
    <main class="landing-content">
      <slot />
    </main>

    <!-- Menu mobile -->
    <q-dialog v-model="mobileMenu" position="right" full-height>
      <q-card class="mobile-menu-card" style="width: 260px; max-width: 80vw">
        <q-list padding>
          <q-item v-for="item in menu" :key="item" clickable v-close-popup @click="goEntrar">
            <q-item-section>{{ item }}</q-item-section>
          </q-item>
          <q-separator class="q-my-sm" />
          <q-item>
            <q-item-section>
              <q-btn unelevated color="green-10" rounded no-caps label="Entrar" v-close-popup @click="goEntrar" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>

    <!-- Theme Toggle -->
    <q-btn
      round
      :icon="isDark ? 'light_mode' : 'dark_mode'"
      :color="isDark ? 'grey-8' : 'grey-7'"
      text-color="white"
      size="sm"
      class="theme-toggle-fixed"
      @click="uiStore.toggleDark()"
    >
      <q-tooltip>{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const isDark = computed(() => uiStore.isDark)

const mobileMenu = ref(false)

const menu = ['Produto', 'Recursos', 'Segurança AT', 'Preços']

function goTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goEntrar() {
  mobileMenu.value = false
  // O formulário de login vive na página (slot) — foca o cartão
  requestAnimationFrame(() => {
    const el = document.getElementById('login-card')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}
</script>

<style>
/* ============ Fundo mesh gradient AI 2026 ============ */
.mesh-bg {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  background:
    radial-gradient(640px circle at 20% 20%, rgba(191, 255, 0, 0.13), transparent 60%),
    radial-gradient(720px circle at 80% 80%, rgba(11, 61, 46, 0.13), transparent 60%),
    #e8f0f8;
}

body.body--dark .mesh-bg {
  background:
    radial-gradient(640px circle at 20% 20%, rgba(191, 255, 0, 0.08), transparent 60%),
    radial-gradient(720px circle at 80% 80%, rgba(11, 61, 46, 0.35), transparent 60%),
    #0b1e16;
}

/* Orbs animados (flutuação suave) */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}

.orb-lime {
  width: 420px;
  height: 420px;
  top: -110px;
  left: -80px;
  background: radial-gradient(circle, rgba(191, 255, 0, 0.35), transparent 70%);
  animation: orb-float-a 14s ease-in-out infinite;
}

.orb-green {
  width: 520px;
  height: 520px;
  bottom: -180px;
  right: -140px;
  background: radial-gradient(circle, rgba(11, 61, 46, 0.3), transparent 70%);
  animation: orb-float-b 18s ease-in-out infinite;
}

body.body--dark .orb {
  opacity: 0.35;
}

@keyframes orb-float-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(70px, 50px) scale(1.1); }
}

@keyframes orb-float-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-60px, -45px) scale(1.06); }
}

/* ============ Navbar glass ============ */
.glass-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.55);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
}

body.body--dark .glass-nav {
  background: rgba(11, 30, 22, 0.55);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.brand-logo {
  border-radius: 10px;
  object-fit: contain;
  background: white;
  padding: 3px;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #0b3d2e;
  line-height: 1.2;
}

.brand-sub {
  font-size: 10px;
  letter-spacing: 0.4px;
  color: #4a5b68;
  line-height: 1.2;
}

body.body--dark .brand-name { color: #ffffff; }
body.body--dark .brand-sub { color: rgba(255, 255, 255, 0.6); }

.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-left: 32px;
}

.nav-link {
  font-size: 13px;
  font-weight: 500;
  color: #24425a;
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: #0b3d2e;
}

body.body--dark .nav-link { color: rgba(255, 255, 255, 0.75); }
body.body--dark .nav-link:hover { color: #bfff00; }

.entrar-btn {
  box-shadow: 0 8px 20px rgba(11, 61, 46, 0.25);
}

/* ============ Conteúdo ============ */
.landing-content {
  position: relative;
  z-index: 1;
}

.mobile-menu-card {
  border-radius: 16px 0 0 16px;
}

.theme-toggle-fixed {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
}

@media (max-width: 900px) {
  .nav-inner {
    height: 56px;
    padding: 0 16px;
  }
}
</style>
