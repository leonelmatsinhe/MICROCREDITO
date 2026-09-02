<template>
  <div class="auth-bg">
    <div class="auth-card">
      <!-- Logo & Header -->
      <div class="text-center q-mb-sm">
        <img
          src="@/assets/logo.png"
          alt="MBR Logo"
          width="56"
          height="56"
          style="border-radius: 10px; object-fit: contain"
        />
        <div class="text-h6 text-weight-bold q-mt-sm">Bem-vindo</div>
        <div class="text-caption text-grey-5">Acesse sua conta para continuar</div>
      </div>

      <!-- Form -->
      <q-form @submit="handleSubmit" class="q-gutter-sm">
        <q-input
          v-model="form.email"
          label="E-mail ou nº de telemóvel"
          outlined
          dense
          :rules="[val => !!val || 'Campo obrigatório']"
          :disable="loading"
        >
          <template v-slot:prepend>
            <q-icon name="mail" color="grey-6" size="18px" />
          </template>
        </q-input>

        <q-input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          label="Senha"
          outlined
          dense
          :rules="[val => !!val || 'Campo obrigatório']"
          :disable="loading"
          @keyup.enter="handleSubmit"
        >
          <template v-slot:prepend>
            <q-icon name="lock" color="grey-6" size="18px" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer text-grey-6"
              size="18px"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <q-banner v-if="error" class="bg-negative text-white" rounded dense>
          <template v-slot:avatar>
            <q-icon name="error" size="16px" />
          </template>
          <span style="font-size: 12px">{{ error }}</span>
        </q-banner>

        <q-btn
          type="submit"
          color="primary"
          class="full-width"
          size="md"
          no-caps
          :loading="loading"
          :disable="loading"
        >
          <template v-if="loading">
            <q-spinner-dots class="q-mr-xs" size="16px" />
            <span style="font-size: 13px">Carregando...</span>
          </template>
          <template v-else>
            <q-icon name="login" class="q-mr-xs" size="18px" />
            <span style="font-size: 13px">Entrar</span>
          </template>
        </q-btn>

        <q-separator class="q-my-xs" />

        <q-btn
          outline
          color="secondary"
          class="full-width"
          size="md"
          no-caps
          :disable="loading"
          @click="showCustomerLogin = true"
        >
          <q-icon name="person" class="q-mr-xs" size="18px" />
          <span style="font-size: 13px">Entrar como Mutuário</span>
        </q-btn>
      </q-form>

      <div class="text-center q-mt-sm text-grey-5" style="font-size: 10px">
        © {{ currentYear }} MBR Microcrédito
      </div>
    </div>

    <!-- Theme Toggle -->
    <q-btn
      round
      :icon="isDark ? 'light_mode' : 'dark_mode'"
      :color="isDark ? 'grey-8' : 'grey-7'"
      text-color="white"
      size="sm"
      style="position: fixed; bottom: 16px; right: 16px; z-index: 1000"
      @click="uiStore.toggleDark()"
    />

    <!-- Customer Login Dialog -->
    <q-dialog v-model="showCustomerLogin" persistent>
      <q-card style="min-width: 300px; max-width: 340px" class="q-pa-sm">
        <q-card-section class="q-pb-none">
          <div class="text-subtitle1 text-weight-bold">Login do Mutuário</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="handleCustomerLogin" class="q-gutter-sm">
            <q-input
              v-model="customerForm.phone"
              label="Telefone ou Email"
              outlined
              dense
              :rules="[val => !!val || 'Campo obrigatório']"
              :disable="customerLoading"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="grey-6" size="18px" />
              </template>
            </q-input>

            <q-input
              v-model="customerForm.password"
              :type="showCustomerPassword ? 'text' : 'password'"
              label="Senha"
              outlined
              dense
              :rules="[val => !!val || 'Campo obrigatório']"
              :disable="customerLoading"
            >
              <template v-slot:prepend>
                <q-icon name="lock" color="grey-6" size="18px" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showCustomerPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer text-grey-6"
                  size="18px"
                  @click="showCustomerPassword = !showCustomerPassword"
                />
              </template>
            </q-input>

            <q-banner v-if="customerError" class="bg-negative text-white" rounded dense>
              <template v-slot:avatar>
                <q-icon name="error" size="16px" />
              </template>
              <span style="font-size: 12px">{{ customerError }}</span>
            </q-banner>

            <q-btn type="submit" color="secondary" class="full-width" size="sm" no-caps :loading="customerLoading" :disable="customerLoading">
              <template v-if="customerLoading">
                <q-spinner-dots class="q-mr-xs" size="14px" />
                <span style="font-size: 12px">Carregando...</span>
              </template>
              <template v-else>
                <q-icon name="login" class="q-mr-xs" size="16px" />
                <span style="font-size: 12px">Entrar</span>
              </template>
            </q-btn>

            <q-btn flat dense no-caps class="full-width" size="sm" @click="showCustomerLogin = false">
              <span style="font-size: 12px">Cancelar</span>
            </q-btn>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()
const uiStore = useUiStore()

const isDark = computed(() => uiStore.isDark)

const form = ref({ email: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const error = ref(null)

const showCustomerLogin = ref(false)
const customerForm = ref({ phone: '', password: '' })
const showCustomerPassword = ref(false)
const customerLoading = ref(false)
const customerError = ref(null)

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  if (authStore.isLoggedIn) {
    router.push(route.query.redirect || authStore.defaultRoute)
  }
})

async function handleSubmit() {
  if (!form.value.email || !form.value.password) {
    error.value = 'Preencha todos os campos'
    return
  }
  loading.value = true
  error.value = null
  try {
    const result = await authStore.login(form.value.email, form.value.password)
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Login realizado com sucesso!', position: 'top' })
      router.push(route.query.redirect || authStore.defaultRoute)
    } else {
      error.value = result.message
    }
  } catch (e) {
    error.value = 'Erro ao conectar ao servidor'
  } finally {
    loading.value = false
  }
}

async function handleCustomerLogin() {
  if (!customerForm.value.phone || !customerForm.value.password) {
    customerError.value = 'Preencha todos os campos'
    return
  }
  customerLoading.value = true
  customerError.value = null
  try {
    const result = await authStore.loginAsCustomer(customerForm.value.phone, customerForm.value.password)
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Login realizado com sucesso!', position: 'top' })
      showCustomerLogin.value = false
      router.push('/portal')
    } else {
      customerError.value = result.message
    }
  } catch (e) {
    customerError.value = 'Erro ao conectar ao servidor'
  } finally {
    customerLoading.value = false
  }
}
</script>

<style>
.auth-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%);
  padding: 20px;
  box-sizing: border-box;
}

body.body--dark .auth-bg {
  background: linear-gradient(135deg, #111827 0%, #1F2937 100%);
}

.auth-card {
  width: 100%;
  max-width: 320px;
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

body.body--dark .auth-card {
  background: #1F2937;
}
</style>
