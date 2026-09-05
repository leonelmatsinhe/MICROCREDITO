<template>
  <div class="auth-bg">
    <!-- Painel de apresentação (marketing) -->
    <div class="auth-hero">
      <div class="hero-inner">
        <div class="hero-brand row items-center">
          <img
            src="@/assets/logo.png"
            alt="Mais Mola Logo"
            width="44"
            height="44"
            style="border-radius: 10px; object-fit: contain; background: white; padding: 4px"
          />
          <div class="q-ml-sm">
            <div class="text-weight-bold" style="font-size: 16px; color: white">Mais Mola</div>
            <div class="text-caption" style="color: rgba(255,255,255,0.65); font-size: 11px">Gestão de Microcrédito</div>
          </div>
        </div>

        <div class="hero-tagline">
          <div class="text-h4 text-weight-bold" style="color: white; line-height: 1.25">
            Gestão de microcrédito<br />simples, segura e eficiente
          </div>
          <p class="text-body1 q-mt-md" style="color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6">
            A plataforma que centraliza todo o ciclo do crédito — do pedido ao reembolso — numa única ferramenta, com controlo total para a sua instituição.
          </p>
        </div>

        <!-- Benefícios -->
        <div class="hero-benefits q-mt-lg">
          <div class="benefit-item">
            <q-icon name="track_changes" size="20px" class="benefit-icon" />
            <div>
              <div class="benefit-title">Acompanhamento integral</div>
              <div class="benefit-desc">Créditos pendentes, desembolsados, terminados e rejeitados num só painel.</div>
            </div>
          </div>
          <div class="benefit-item">
            <q-icon name="event_repeat" size="20px" class="benefit-icon" />
            <div>
              <div class="benefit-title">Prestações e alertas automáticos</div>
              <div class="benefit-desc">Planos de amortização, controlo de mora e avisos por SMS e WhatsApp.</div>
            </div>
          </div>
          <div class="benefit-item">
            <q-icon name="insights" size="20px" class="benefit-icon" />
            <div>
              <div class="benefit-title">Relatórios e exportação</div>
              <div class="benefit-desc">Dados exportáveis em PDF e Excel, com relatórios prontos para o Banco de Moçambique.</div>
            </div>
          </div>
          <div class="benefit-item">
            <q-icon name="verified_user" size="20px" class="benefit-icon" />
            <div>
              <div class="benefit-title">Acesso por perfis</div>
              <div class="benefit-desc">Administrador, Gestor de Crédito e Operador com permissões próprias.</div>
            </div>
          </div>
        </div>

        <!-- Portal do Mutuário -->
        <div class="hero-portal q-mt-lg">
          <q-icon name="person" size="18px" style="color: #4ade80" class="q-mr-sm" />
          <div class="col">
            <div class="text-weight-medium" style="font-size: 13px; color: white">É mutuário?</div>
            <div class="text-caption" style="color: rgba(255,255,255,0.7); font-size: 12px">
              Acompanhe as suas prestações, pagamentos e extractos no Portal do Mutuário.
            </div>
          </div>
          <q-btn
            outline
            color="white"
            size="sm"
            no-caps
            class="q-ml-md"
            :disable="loading"
            @click="showCustomerLogin = true"
          >
            Portal do Mutuário
          </q-btn>
        </div>
      </div>
    </div>

    <!-- Painel do formulário -->
    <div class="auth-form-side">
      <div class="auth-card">
        <!-- Logo & Header -->
        <div class="text-center q-mb-md">
          <img
            src="@/assets/logo.png"
            alt="Mais Mola Logo"
            width="52"
            height="52"
            style="border-radius: 10px; object-fit: contain"
          />
          <div class="text-h6 text-weight-bold q-mt-sm">Bem-vindo</div>
          <div class="text-caption text-grey-5">Aceda com as suas credenciais de equipa</div>
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

          <q-btn
            flat
            color="primary"
            class="full-width"
            size="md"
            no-caps
            :disable="loading"
            @click="openRegister"
          >
            <q-icon name="person_add" class="q-mr-xs" size="18px" />
            <span style="font-size: 13px">Criar conta de mutuário</span>
          </q-btn>
        </q-form>

        <div class="text-center q-mt-sm text-grey-5" style="font-size: 10px">
          © {{ currentYear }} Mais Mola
        </div>
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

    <!-- Auto-cadastro de Mutuário (Login → Criar conta) -->
    <q-dialog v-model="showRegister" persistent position="right" full-height>
      <q-card class="register-card" style="width: 520px; max-width: 92vw">
        <q-card-section class="row items-center bg-primary text-white" style="border-radius: 12px 12px 0 0">
          <q-icon name="person_add" size="24px" class="q-mr-sm" />
          <div class="text-h6">Criar conta de mutuário</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeRegister" />
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: calc(100vh - 170px); overflow-y: auto">
          <q-form @submit="submitRegistration" class="q-gutter-md">
            <!-- Dados Pessoais -->
            <div class="text-subtitle2 text-primary q-mb-xs">
              <q-icon name="person" size="16px" class="q-mr-xs" />
              Dados Pessoais
            </div>

            <q-input
              v-model="registerForm.customerName"
              dense
              outlined
              label="Nome Completo *"
              :rules="[val => !!val || 'Nome é obrigatório']"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select
                  v-model="registerForm.sex"
                  dense
                  outlined
                  label="Género *"
                  :options="sexOptions"
                  emit-value
                  map-options
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="registerForm.maritalStatus"
                  dense
                  outlined
                  label="Estado Civil"
                  :options="maritalOptions"
                  emit-value
                  map-options
                />
              </div>
            </div>

            <q-input
              v-model="registerForm.customerDateOfBirth"
              dense
              outlined
              label="Data de Nascimento"
              placeholder="dd/mm/aaaa"
            />

            <!-- Identificação -->
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="badge" size="16px" class="q-mr-xs" />
              Identificação
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="registerForm.customerNuit"
                  dense
                  outlined
                  label="NUIT"
                  mask="#############"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="registerForm.customerNationalId"
                  dense
                  outlined
                  label="Nº BI / Passaporte"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="registerForm.issuedAt"
                  dense
                  outlined
                  label="Data de Emissão"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="registerForm.localOfIssue"
                  dense
                  outlined
                  label="Local de Emissão"
                />
              </div>
            </div>

            <!-- Contacto -->
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="phone" size="16px" class="q-mr-xs" />
              Contacto
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="registerForm.customerPhone"
                  dense
                  outlined
                  label="Telefone *"
                  mask="#############"
                  :rules="[val => !!val || 'Telefone é obrigatório']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="registerForm.customerEmail"
                  dense
                  outlined
                  label="Email"
                  type="email"
                />
              </div>
            </div>

            <!-- Profissão e Rendimento -->
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="work" size="16px" class="q-mr-xs" />
              Profissão e Rendimento
            </div>

            <q-input
              v-model="registerForm.customerProfession"
              dense
              outlined
              label="Profissão"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="registerForm.customerMonthlySalary"
                  dense
                  outlined
                  label="Rendimento Mensal"
                  type="number"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="registerForm.customerLocalOfWork"
                  dense
                  outlined
                  label="Local de Trabalho"
                />
              </div>
            </div>

            <!-- Morada -->
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="location_on" size="16px" class="q-mr-xs" />
              Morada
            </div>

            <q-input
              v-model="registerForm.customerAddress"
              dense
              outlined
              label="Endereço"
            />

            <q-input
              v-model="registerForm.customerBairro"
              dense
              outlined
              label="Bairro"
            />

            <!-- Documentos -->
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="folder_open" size="16px" class="q-mr-xs" />
              Documentos
            </div>

            <q-banner class="bg-primary text-white" rounded dense style="font-size: 12px">
              <template v-slot:avatar>
                <q-icon name="info" size="16px" />
              </template>
              Submeta os documentos em imagem (jpg/png) ou PDF. Serão analisados pela instituição antes da aprovação do primeiro empréstimo.
            </q-banner>

            <q-file
              v-model="registerForm.documentBiFile"
              dense
              outlined
              label="BI ou Passaporte"
              accept=".jpg,.jpeg,.png,.pdf"
              max-file-size="5242880"
            >
              <template v-slot:prepend>
                <q-icon name="badge" />
              </template>
            </q-file>

            <q-file
              v-model="registerForm.documentNuitFile"
              dense
              outlined
              label="NUIT"
              accept=".jpg,.jpeg,.png,.pdf"
              max-file-size="5242880"
            >
              <template v-slot:prepend>
                <q-icon name="pin" />
              </template>
            </q-file>

            <q-file
              v-model="registerForm.documentBairroFile"
              dense
              outlined
              label="Declaração de Bairro"
              accept=".jpg,.jpeg,.png,.pdf"
              max-file-size="5242880"
            >
              <template v-slot:prepend>
                <q-icon name="home_work" />
              </template>
            </q-file>

            <q-file
              v-model="registerForm.passportPhotoFile"
              dense
              outlined
              label="Fotografia tipo passe (jpg/png)"
              accept=".jpg,.jpeg,.png"
              max-file-size="5242880"
            >
              <template v-slot:prepend>
                <q-icon name="camera_alt" />
              </template>
            </q-file>
            <div v-if="passportPreview" class="row items-center q-gap-sm q-mt-xs">
              <img
                :src="passportPreview"
                alt="Foto tipo passe"
                style="width: 44px; height: 52px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc"
              />
              <span class="text-caption text-grey-6">{{ registerForm.passportPhotoFile?.name }}</span>
            </div>

            <!-- Acesso -->
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="lock" size="16px" class="q-mr-xs" />
              Acesso ao Portal
            </div>

            <q-input
              v-model="registerForm.password"
              dense
              outlined
              label="Senha *"
              type="password"
              :rules="[val => val && val.length >= 4 || 'Mínimo de 4 caracteres']"
            />

            <q-input
              v-model="registerForm.confirmPassword"
              dense
              outlined
              label="Confirmar Senha *"
              type="password"
              :rules="[val => val === registerForm.password || 'As senhas não coincidem']"
            />

            <q-banner v-if="registerError" class="bg-negative text-white" rounded dense>
              <template v-slot:avatar>
                <q-icon name="error" size="16px" />
              </template>
              <span style="font-size: 12px">{{ registerError }}</span>
            </q-banner>

            <div class="row justify-end q-gutter-sm q-mt-lg q-pb-sm">
              <q-btn flat label="Cancelar" color="grey" @click="closeRegister" />
              <q-btn
                type="submit"
                unelevated
                label="Criar Conta"
                icon="person_add"
                color="primary"
                :loading="registerSaving"
              />
            </div>
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
import { api } from '@/boot/axios'

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

// ===== Auto-cadastro de mutuário =====
const showRegister = ref(false)
const registerSaving = ref(false)
const registerError = ref(null)

const sexOptions = [
  { label: 'Masculino', value: 'M' },
  { label: 'Feminino', value: 'F' }
]

const maritalOptions = [
  { label: 'Solteiro(a)', value: 'solteiro' },
  { label: 'Casado(a)', value: 'casado' },
  { label: 'Divorciado(a)', value: 'divorciado' },
  { label: 'Viúvo(a)', value: 'viuvo' },
  { label: 'União de Facto', value: 'uniao' }
]

const registerForm = ref({
  customerName: '',
  sex: 'M',
  maritalStatus: 'solteiro',
  customerDateOfBirth: '',
  customerNuit: '',
  customerNationalId: '',
  issuedAt: '',
  localOfIssue: '',
  customerPhone: '',
  customerEmail: '',
  customerProfession: '',
  customerMonthlySalary: '',
  customerLocalOfWork: '',
  customerAddress: '',
  customerBairro: '',
  documentBiFile: null,
  documentNuitFile: null,
  documentBairroFile: null,
  passportPhotoFile: null,
  password: '',
  confirmPassword: ''
})

const passportPreview = computed(() => {
  const file = registerForm.value.passportPhotoFile
  return file ? URL.createObjectURL(file) : null
})

function openRegister() {
  registerForm.value = {
    customerName: '',
    sex: 'M',
    maritalStatus: 'solteiro',
    customerDateOfBirth: '',
    customerNuit: '',
    customerNationalId: '',
    issuedAt: '',
    localOfIssue: '',
    customerPhone: '',
    customerEmail: '',
    customerProfession: '',
    customerMonthlySalary: '',
    customerLocalOfWork: '',
    customerAddress: '',
    customerBairro: '',
    documentBiFile: null,
    documentNuitFile: null,
    documentBairroFile: null,
    passportPhotoFile: null,
    password: '',
    confirmPassword: ''
  }
  registerError.value = null
  showRegister.value = true
}

function closeRegister() {
  if (registerSaving.value) return
  showRegister.value = false
  registerError.value = null
}

// Envia um ficheiro para o endpoint público de upload e devolve a URL local
async function uploadPublicFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const resp = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await resp.json()
  if (!data.success || (!data.documentFileUrl && !data.imageUrl)) {
    throw new Error(data.message || 'Falha no envio do ficheiro')
  }
  return data.documentFileUrl || `/documents/${data.imageUrl}`
}

async function submitRegistration() {
  const f = registerForm.value
  if (!f.customerName || !f.customerPhone || !f.password) {
    registerError.value = 'Preencha os campos obrigatórios (nome, telefone e senha)'
    return
  }
  if (f.password.length < 4) {
    registerError.value = 'A senha deve ter pelo menos 4 caracteres'
    return
  }
  if (f.password !== f.confirmPassword) {
    registerError.value = 'As senhas não coincidem'
    return
  }

  registerSaving.value = true
  registerError.value = null
  try {
    // 1) Subir os documentos (BI/passaporte, NUIT, declaração de bairro) e a foto
    const documents = []
    if (f.documentBiFile) {
      documents.push({ documentName: 'BI/Passaporte', documentFileUrl: await uploadPublicFile(f.documentBiFile) })
    }
    if (f.documentNuitFile) {
      documents.push({ documentName: 'NUIT', documentFileUrl: await uploadPublicFile(f.documentNuitFile) })
    }
    if (f.documentBairroFile) {
      documents.push({ documentName: 'Declaração de Bairro', documentFileUrl: await uploadPublicFile(f.documentBairroFile) })
    }
    let passportPhotoUrl = null
    if (f.passportPhotoFile) {
      passportPhotoUrl = await uploadPublicFile(f.passportPhotoFile)
    }

    // 2) Criar a conta (endpoint público de auto-cadastro)
    const { data } = await api.post('/api/customer/register', {
      customerName: f.customerName,
      sex: f.sex,
      maritalStatus: f.maritalStatus,
      customerDateOfBirth: f.customerDateOfBirth,
      customerNuit: f.customerNuit,
      customerNationalId: f.customerNationalId,
      issuedAt: f.issuedAt,
      localOfIssue: f.localOfIssue,
      customerPhone: f.customerPhone,
      customerEmail: f.customerEmail,
      customerProfession: f.customerProfession,
      customerMonthlySalary: f.customerMonthlySalary,
      customerLocalOfWork: f.customerLocalOfWork,
      customerAddress: f.customerAddress,
      customerBairro: f.customerBairro,
      documents,
      passportPhotoUrl,
      customerPassword: f.password
    })

    if (!data.success) {
      registerError.value = data.message || 'Erro ao criar a conta'
      return
    }

    // 3) Entrar automaticamente no portal do mutuário
    const login = await authStore.loginAsCustomer(f.customerPhone, f.password)
    if (login.success) {
      $q.notify({
        type: 'positive',
        message: 'Conta criada com sucesso! Bem-vindo ao Portal do Mutuário.',
        position: 'top'
      })
      showRegister.value = false
      router.push('/portal')
    } else {
      // Conta criada mas o login automático falhou — orientar para o login manual
      $q.notify({
        type: 'positive',
        message: 'Conta criada com sucesso! Entre com o seu telefone e senha.',
        position: 'top'
      })
      showRegister.value = false
      showCustomerLogin.value = true
      customerForm.value = { phone: f.customerPhone, password: f.password }
    }
  } catch (e) {
    registerError.value = e.response?.data?.message || e.message || 'Erro ao criar a conta'
  } finally {
    registerSaving.value = false
  }
}

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
  align-items: stretch;
  /* Gradiente verde → azul em toda a página, coordenado com a marca */
  background: linear-gradient(135deg, #0b3d2e 0%, #15653b 30%, #1b7a45 45%, #15807a 60%, #1e6fa8 80%, #1e40af 100%);
  box-sizing: border-box;
  position: relative;
}

body.body--dark .auth-bg {
  background: linear-gradient(135deg, #0b1e16 0%, #12352a 30%, #0f3d46 55%, #123a63 80%, #14294f 100%);
}

/* ============ Painel esquerdo (marketing) ============ */
.auth-hero {
  flex: 1 1 55%;
  max-width: 55%;
  /* Transparente: o gradiente da página atravessa o painel inteiro */
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  box-sizing: border-box;
}

.hero-inner {
  max-width: 520px;
  width: 100%;
}

.hero-tagline {
  margin-top: 40px;
}

.hero-benefits {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.benefit-icon {
  color: #4ade80;
  flex-shrink: 0;
  margin-top: 2px;
}

.benefit-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.benefit-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin-top: 2px;
}

.hero-portal {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
}

body.body--dark .hero-portal {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

/* ============ Painel direito (formulário) ============ */
.auth-form-side {
  flex: 1 1 45%;
  max-width: 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.auth-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

body.body--dark .auth-card {
  background: #1f2937;
}

.register-card {
  border-radius: 12px;
}

body.body--dark .register-card {
  background: #1f2937;
}

/* ============ Responsivo ============ */
@media (max-width: 900px) {
  .auth-bg {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .auth-hero {
    max-width: 100%;
    width: 100%;
    flex: none;
    padding: 24px 20px;
    border-radius: 14px;
    margin-bottom: 16px;
  }

  .hero-tagline {
    margin-top: 16px;
  }

  .hero-tagline .text-h4 {
    font-size: 22px !important;
  }

  .hero-benefits {
    gap: 10px;
  }

  .hero-portal {
    margin-top: 12px;
  }

  .auth-form-side {
    max-width: 100%;
    width: 100%;
    flex: none;
    padding: 0;
  }

  .auth-card {
    max-width: 400px;
  }
}
</style>