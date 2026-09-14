<template>
  <div class="register-company-page">
    <!-- Header -->
    <header class="rc-header">
      <div class="rc-header-inner">
        <router-link to="/" class="brand">
          <span class="brand-mark">M</span>
          <span class="brand-text">
            <b>Mais Mola</b>
            <small>GESTÃO DE MICROCRÉDITO</small>
          </span>
        </router-link>
        <router-link class="btn-ghost" to="/">← Voltar ao site</router-link>
      </div>
    </header>

    <div class="rc-body">
      <div class="rc-container">
        <div class="center-head">
          <span class="tag">CADASTRO DA EMPRESA</span>
          <h2>Crie a conta da sua microcrédito</h2>
          <p>
            Preencha os dados abaixo. Após a submissão, o Super Admin vai validar
            as informações e activará o seu acesso (normalmente em 24h).
          </p>
        </div>

        <q-form @submit="handleSubmit" class="rc-form q-gutter-sm">
          <!-- ════════ DADOS DA EMPRESA ════════ -->
          <div class="section-title">
            <q-icon name="domain" size="18px" />
            <span>Dados da Empresa</span>
          </div>

          <q-input v-model="form.companyName" outlined dense label="Nome da Microcrédito *"
            :rules="[v => !!v || 'Campo obrigatório']" />
          <q-input v-model="form.companyNuit" outlined dense label="NUIT *" mask="#########"
            :rules="[v => !!v || 'Campo obrigatório']" />
          <q-input v-model="form.licenseNumber" outlined dense label="Licença BM (opcional)" />
          <q-select v-model="form.provinceId" outlined dense label="Província *" emit-value map-options
            :options="provinceOptions" @update:model-value="onProvinceChange"
            :rules="[v => !!v || 'Campo obrigatório']" />
          <q-select v-model="form.districtId" outlined dense label="Distrito" emit-value map-options
            :options="districtOptions" :disable="!form.provinceId" clearable
            :loading="districtsLoading"
            :rules="[v => !v || !!form.provinceId || 'Escolha a província primeiro']" />
          <div v-if="form.provinceId && districtOptions.length === 0 && !districtsLoading" class="text-caption text-grey-7 q-ml-md">
            Sem distritos cadastrados para esta província — pode escrever o distrito no endereço.
          </div>
          <q-input v-model="form.companyAddress" outlined dense label="Endereço" />
          <q-input v-model="form.companyPhone" outlined dense label="Telefone Empresa *" mask="#########"
            :rules="[v => !!v || 'Campo obrigatório']" />
          <q-input v-model="form.companyEmail" outlined dense label="Email Empresa *" type="email"
            :rules="[v => !!v || 'Campo obrigatório', v => /.+@.+\..+/.test(v) || 'Email inválido']" />

          <!-- ════════ DADOS DO RESPONSÁVEL ════════ -->
          <div class="section-title q-mt-md">
            <q-icon name="person" size="18px" />
            <span>Dados do Responsável</span>
          </div>

          <q-input v-model="form.responsibleName" outlined dense label="Nome Completo *"
            :rules="[v => !!v || 'Campo obrigatório']" />
          <q-input v-model="form.responsiblePhone" outlined dense label="Telefone Pessoal (+258...) *"
            :rules="[v => !!v || 'Campo obrigatório']" />
          <q-input v-model="form.responsibleEmail" outlined dense label="Email *" type="email"
            :rules="[v => !!v || 'Campo obrigatório', v => /.+@.+\..+/.test(v) || 'Email inválido']" />
          <q-input v-model="form.password" outlined dense label="Senha *" type="password"
            :rules="[v => !!v || 'Campo obrigatório', v => v.length >= 6 || 'Mínimo 6 caracteres']" />
          <q-input v-model="form.confirmPassword" outlined dense label="Confirmar Senha *" type="password"
            :rules="[v => v === form.password || 'As senhas não coincidem']" />

          <!-- ════════ PLANO ════════ -->
          <div class="section-title q-mt-md">
            <q-icon name="payments" size="18px" />
            <span>Plano Desejado</span>
          </div>

          <q-option-group
            v-model="form.planId"
            type="radio"
            color="green-8"
            :options="planRadioOptions"
            :rules="[v => !!v || 'Escolha um plano']"
          />
          <div v-if="!form.planId" class="text-caption text-negative q-ml-md">Escolha um plano</div>

          <!-- ════════ TERMOS ════════ -->
          <q-checkbox v-model="form.acceptedTerms" color="green-8" class="q-mt-sm"
            label="Aceito os termos e que meus dados irão para validação" />

          <q-banner v-if="error" class="bg-negative text-white" rounded dense>
            {{ error }}
          </q-banner>
          <q-banner v-if="success" class="bg-positive text-white" rounded dense>
            {{ success }}
          </q-banner>

          <q-btn type="submit" unelevated color="dark" size="lg" class="full-width submit-btn" no-caps
            :loading="loading" :disable="success">
            <q-icon name="send" class="q-mr-sm" />
            Submeter para Aprovação
          </q-btn>
        </q-form>
      </div>
    </div>

    <!-- Footer -->
    <footer class="rc-footer">
      <div>© {{ year }} Mais Mola — Gestão de Microcrédito</div>
      <div class="rc-footer-contacts">
        <span>✆ +258 870740202</span>
        <span>📱 +258 8353816</span>
        <span>✉ leonelmatsinhe@gmail.com</span>
        <span>📍 Bairro de Incassane Q.5 Casa 35 Katembe Maputo</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

const router = useRouter()
const $q = useQuasar()

const year = new Date().getFullYear()
const loading = ref(false)
const error = ref(null)
const success = ref(null)

// ── Planos dinâmicos (GET /api/subscription-plans?is_active=1) ──
const plans = ref([])
const planRadioOptions = computed(() => plans.value.map(p => ({
  label: `${p.name} — ${Number(p.price_mzn).toLocaleString('pt-MZ')} MZN/mês (${Number(p.max_clients) >= 999999 ? 'clientes ilimitados' : 'até ' + Number(p.max_clients) + ' clientes'})`,
  value: p.id
})))

onMounted(async () => {
  loadLocations()
  try {
    const { data } = await api.get('/api/subscription-plans', { params: { is_active: 1 } })
    if (data.success) {
      plans.value = data.result || []
      // Por defeito, seleccionar o plano MAIS POPULAR
      const popular = plans.value.find(p => Number(p.is_popular) === 1)
      if (popular) form.value.planId = popular.id
    }
  } catch { /* mantém lista vazia — validação exige escolha */ }
})

// ── Províncias e Distritos (API, com relacionamento provincia → distritos) ──
const provinceOptions = ref([])
const allDistricts = ref([])
const districtsLoading = ref(false)
const districtOptions = computed(() =>
  allDistricts.value
    .filter(d => Number(d.provinceId) === Number(form.value.provinceId))
    .map(d => ({ label: d.name, value: d.id }))
)

// Autopopula os distritos quando a província muda; limpa a selecção anterior
function onProvinceChange() {
  form.value.districtId = null
}

async function loadLocations() {
  districtsLoading.value = true
  try {
    const [prov, dist] = await Promise.all([
      api.get('/api/provinces'),
      api.get('/api/districts'),
    ])
    if (prov.data.success) {
      provinceOptions.value = prov.data.result.map(p => ({ label: p.name, value: p.id }))
    }
    if (dist.data.success) allDistricts.value = dist.data.result || []
  } catch { /* deixa vazio — província fica sem opções mas não bloqueia o resto */ }
  districtsLoading.value = false
}

const planOptions = [
  { label: 'Starter — 2.500 MZN/mês (até 100 clientes)', value: 'STARTER' },
  { label: 'Crescimento — 4.500 MZN/mês (até 500 clientes)', value: 'CRESCIMENTO' },
  { label: 'Profissional — 8.500 MZN/mês (clientes ilimitados)', value: 'PROFISSIONAL' }
]

const form = ref({
  companyName: '',
  companyNuit: '',
  licenseNumber: '',
  provinceId: null,
  districtId: null,
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  responsibleName: '',
  responsiblePhone: '',
  responsibleEmail: '',
  password: '',
  confirmPassword: '',
  planId: null,
  acceptedTerms: false
})

async function handleSubmit() {
  if (!form.value.acceptedTerms) {
    error.value = 'É obrigatório aceitar os termos e a validação dos dados.'
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true
  error.value = null
  try {
    const { data } = await api.post('/api/companies/register', {
      companyName: form.value.companyName,
      companyNuit: form.value.companyNuit,
      licenseNumber: form.value.licenseNumber || null,
      provinceId: form.value.provinceId,
      districtId: form.value.districtId || null,
      companyAddress: form.value.companyAddress || null,
      companyPhone: form.value.companyPhone,
      companyEmail: form.value.companyEmail,
      responsibleName: form.value.responsibleName,
      responsiblePhone: form.value.responsiblePhone,
      responsibleEmail: form.value.responsibleEmail,
      password: form.value.password,
      planId: form.value.planId,
      acceptedTerms: form.value.acceptedTerms
    })

    if (data.success) {
      success.value = data.message || 'Cadastro recebido, aguardando aprovação'
      $q.notify({ type: 'positive', message: success.value, position: 'top' })
      setTimeout(() => router.push('/'), 3500)
    } else {
      error.value = data.message || 'Erro ao submeter o cadastro.'
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Erro ao conectar ao servidor.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-company-page {
  font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #e8eef5;
  color: #0f172a;
}

/* Header */
.rc-header {
  position: sticky; top: 0; z-index: 9999;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  background: rgba(255,255,255,0.92);
  box-shadow: 0 2px 14px rgba(15,23,42,.08);
}
.rc-header-inner {
  max-width: 1100px; margin: 0 auto; padding: 12px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.brand-mark {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #0b3d2e, #14532d);
  color: #34d399; font-weight: 900; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
}
.brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.brand-text b { color: #0b3d2e; font-size: 1.05rem; }
.brand-text small { color: #8aa397; font-size: .58rem; letter-spacing: .14em; }
.btn-ghost {
  text-decoration: none; font-weight: 700; font-size: .85rem;
  background: #fff; color: #0b3d2e; border: 1px solid #d8e4dc;
  border-radius: 999px; padding: 9px 20px;
}

/* Body */
.rc-body { flex: 1; padding: 48px 24px; }
.rc-container { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 20px; padding: 36px; border: 1px solid #e8f0ea; }
.center-head { text-align: center; margin-bottom: 28px; }
.center-head h2 { font-size: 1.7rem; font-weight: 800; color: #0b3d2e; margin: 8px 0; letter-spacing: -.4px; }
.center-head p { color: #5b6b62; font-size: .92rem; margin: 0; }
.tag {
  display: inline-block; background: #e7efe9; color: #0b3d2e;
  font-size: .68rem; font-weight: 800; letter-spacing: .12em;
  padding: 6px 14px; border-radius: 999px;
}
.section-title {
  display: flex; align-items: center; gap: 8px;
  color: #0b3d2e; font-weight: 800; font-size: .95rem;
  border-bottom: 2px solid #e7efe9; padding-bottom: 8px; margin-bottom: 4px;
}
.submit-btn { background: #0b3d2e; margin-top: 12px; }

/* Footer */
.rc-footer {
  background: #08120d; color: #9fb3a8; padding: 20px 24px;
  display: flex; flex-direction: column; gap: 8px; align-items: center;
  font-size: .8rem; text-align: center;
}
.rc-footer-contacts { display: flex; gap: 18px; flex-wrap: wrap; justify-content: center; }

@media (max-width: 599px) {
  .rc-container { padding: 24px 18px; }
}
</style>
