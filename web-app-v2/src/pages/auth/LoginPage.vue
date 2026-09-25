<template>
  <div class="login-section">
      <div class="login-container q-py-xl">
        <div class="row q-col-gutter-xl items-center justify-center">

          <!-- ============ COLUNA ESQUERDA — MARKETING ============ -->
          <div class="col-12 col-md-6">
            <div class="hero-copy">
              <q-badge color="lime" text-color="green-10" rounded class="cert-badge q-pa-sm">
                <q-icon name="verified" size="14px" class="q-mr-xs" />
                ✓ Certificado AT 2026 • REC-{{ currentYear }}-84321
              </q-badge>

              <h1 class="hero-title text-h2 text-weight-bolder q-mt-md q-mb-none">
                Gestão de microcrédito<br />
                <span class="hero-title-accent">simples, segura</span> e eficiente
              </h1>

              <p class="hero-sub q-mt-md">
                A plataforma que centraliza todo o ciclo do crédito — do pedido ao reembolso —
                numa única ferramenta, com controlo total para a sua instituição.
              </p>

              <!-- Features -->
              <div class="features q-mt-lg">
                <div class="feature-item">
                  <q-avatar color="green-9" text-color="white" size="42px">
                    <q-icon name="track_changes" size="22px" />
                  </q-avatar>
                  <div class="q-ml-md">
                    <div class="feature-title">Acompanhamento integral</div>
                    <div class="feature-desc">Créditos pendentes, desembolsados, terminados e rejeitados num só painel.</div>
                  </div>
                </div>

                <div class="feature-item">
                  <q-avatar color="green-9" text-color="white" size="42px">
                    <q-icon name="event_repeat" size="22px" />
                  </q-avatar>
                  <div class="q-ml-md">
                    <div class="feature-title">Prestações e alertas automáticos</div>
                    <div class="feature-desc">Planos de amortização, controlo de mora e avisos por SMS e WhatsApp.</div>
                  </div>
                </div>

                <div class="feature-item">
                  <q-avatar color="green-9" text-color="white" size="42px">
                    <q-icon name="insights" size="22px" />
                  </q-avatar>
                  <div class="q-ml-md">
                    <div class="feature-title">Relatórios e exportação</div>
                    <div class="feature-desc">Dados exportáveis em PDF e Excel, com relatórios prontos para o Banco de Moçambique.</div>
                  </div>
                </div>

                <div class="feature-item">
                  <q-avatar color="green-9" text-color="white" size="42px">
                    <q-icon name="verified_user" size="22px" />
                  </q-avatar>
                  <div class="q-ml-md">
                    <div class="feature-title">Acesso por perfis</div>
                    <div class="feature-desc">Administrador, Gestor de Crédito e Operador com permissões próprias.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============ COLUNA DIREITA — LOGIN ============ -->
          <div class="col-12 col-md-5 offset-md-1">
            <q-card id="login-card" flat class="login-glass-card q-pa-lg" style="border-radius: 24px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px)">
              <!-- Header -->
              <div class="text-center q-mb-md">
                <img
                  src="@/assets/logo.png"
                  alt="Mais Mola Logo"
                  width="52"
                  height="52"
                  style="border-radius: 14px; object-fit: contain"
                />
                <div class="text-h6 text-weight-bold q-mt-sm">Bem-vindo</div>
                <div class="text-caption text-grey-6">Aceda com as suas credenciais de equipa</div>
              </div>

              <!-- Form -->
              <q-form @submit="handleSubmit" greedy class="q-gutter-md">
                <q-input
                  v-model="form.email"
                  label="E-mail ou nº de telemóvel"
                  outlined
                  rounded
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
                  rounded
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

                <q-banner v-if="error" class="bg-negative text-white login-error" rounded dense>
                  <template v-slot:avatar>
                    <q-icon name="error" size="16px" />
                  </template>
                  <span style="font-size: 12px">{{ error }}</span>
                </q-banner>

                <!-- Botão principal -->
                <q-btn
                  type="submit"
                  unelevated
                  color="green-10"
                  rounded
                  size="lg"
                  class="full-width login-main-btn"
                  no-caps
                  :loading="loading"
                  :disable="loading"
                >
                  <template v-if="loading">
                    <q-spinner-dots class="q-mr-xs" size="18px" />
                    <span>Carregando...</span>
                  </template>
                  <template v-else>
                    <q-icon name="login" class="q-mr-xs" size="20px" />
                    <span>Entrar</span>
                  </template>
                </q-btn>

                <!-- Botão secundário -->
                <q-btn
                  outline
                  color="green-10"
                  rounded
                  size="lg"
                  class="full-width"
                  no-caps
                  :disable="loading"
                  @click="showCustomerLogin = true"
                >
                  <q-icon name="person" class="q-mr-xs" size="20px" />
                  <span>Painel do Mutuário</span>
                </q-btn>

                <!-- Link criar conta -->
                <div class="text-center">
                  <q-btn
                    flat
                    no-caps
                    dense
                    color="green-10"
                    class="register-link"
                    :disable="loading"
                    @click="openRegister"
                  >
                    <q-icon name="person_add" size="16px" class="q-mr-xs" />
                    <span class="text-underline">Criar conta de mutuário</span>
                  </q-btn>
                </div>
              </q-form>

              <q-separator class="q-my-md" style="opacity: 0.4" />

              <!-- Rodapé: selo de segurança + copyright -->
              <div class="column items-center q-gutter-xs">
                <q-chip outline color="green-9" text-color="green-10" icon="lock" size="12px" class="security-chip">
                  UUIDv7 • SHA-256 • QR Code AT
                </q-chip>
                <div class="text-caption text-grey-6" style="font-size: 11px">
                  © {{ currentYear }} Mais Mola
                </div>
              </div>
            </q-card>
          </div>

        </div>
      </div>
    </div>

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
              type="date"
              :max="adultBirthDate"
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
                  type="date"
                  :max="todayDate"
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()

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

// Limites de datas do auto-cadastro (adulto + não-futuro)
const todayDate = computed(() => new Date().toISOString().slice(0, 10))
const adultBirthDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  return d.toISOString().slice(0, 10)
})

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

      // Super Admin (role 0) vai directo ao Painel da Empresa (aprovações)
      if (result.user?.userRole === 0) {
        router.push('/company')
        return
      }

      // Empresa ainda não aprovada — bloquear entrada no painel
      if (result.user?.companyStatus && result.user.companyStatus !== 'APROVADA') {
        error.value = 'Sua empresa está aguardando aprovação do Super Admin. Contacto: +258 870740202'
        authStore.logout()
        return
      }

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
/* ============ Secção de login (abaixo da navbar glass) ============ */
.login-section {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
}

.login-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
  box-sizing: border-box;
}

/* ============ Marketing (esquerda) ============ */
.hero-copy {
  max-width: 560px;
}

.cert-badge {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
  box-shadow: 0 4px 14px rgba(11, 61, 46, 0.18);
}

.hero-title {
  color: #0b3d2e;
  line-height: 1.15 !important;
  /* text-h2 é enorme em ecrãs pequenos — clamp mantém o peso visual sem quebrar */
  font-size: clamp(28px, 4.2vw, 48px);
}

.hero-title-accent {
  color: #2e7d32;
}

body.body--dark .hero-title { color: #ffffff; }
body.body--dark .hero-title-accent { color: #bfff00; }

.hero-sub {
  color: #4a5b68;
  font-size: 15px;
  line-height: 1.65;
  max-width: 480px;
}

body.body--dark .hero-sub { color: rgba(255, 255, 255, 0.72); }

.features {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
}

.feature-item .q-avatar {
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(11, 61, 46, 0.22);
}

.feature-title {
  font-size: 15px;
  font-weight: 700;
  color: #0b3d2e;
  line-height: 1.3;
}

.feature-desc {
  font-size: 12.5px;
  color: #5b6b78;
  line-height: 1.5;
  margin-top: 2px;
  max-width: 420px;
}

body.body--dark .feature-title { color: #ffffff; }
body.body--dark .feature-desc { color: rgba(255, 255, 255, 0.68); }

/* ============ Cartão de login (direita) ============ */
.login-glass-card {
  box-shadow: 0 24px 60px rgba(11, 61, 46, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.6);
  max-width: 460px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

body.body--dark .login-glass-card {
  background: rgba(15, 32, 25, 0.88) !important;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45) !important;
}

body.body--dark .login-glass-card .text-caption,
body.body--dark .login-glass-card .text-grey-6 {
  color: rgba(255, 255, 255, 0.65) !important;
}

body.body--dark .login-glass-card .text-h6 {
  color: #ffffff;
}

.login-main-btn {
  box-shadow: 0 10px 26px rgba(11, 61, 46, 0.35);
}

.register-link .text-underline {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.security-chip {
  border-radius: 20px;
}

.login-error {
  border-radius: 12px;
}

/* ============ Responsivo ============ */
@media (max-width: 1023px) {
  .login-section {
    min-height: auto;
    padding-top: 8px;
  }

  .login-container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .hero-copy {
    max-width: 100%;
  }

  .login-glass-card {
    max-width: 480px;
  }
}
</style>
