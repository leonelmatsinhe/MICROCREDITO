<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Meu Painel</div>
        <div class="text-caption text-grey-5">
          Portal do Mutuário
        </div>
      </div>
      <div class="col-auto">
        <q-btn flat dense icon="logout" color="negative" label="Sair" @click="handleLogout" no-caps />
      </div>
    </div>

    <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="person" size="64px" color="primary" />
        <div class="text-h6 q-mt-md">Bem-vindo, {{ authStore.userName }}</div>
        <div class="text-caption text-grey-5 q-mb-md">
          Portal do mutuário em construção. Em breve terá acesso aos seus créditos e pagamentos.
        </div>
        <q-badge color="info" label="Fase 9 em desenvolvimento" />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>
