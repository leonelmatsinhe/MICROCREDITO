<template>
  <div class="sa-settings-page">
    <!-- HEADER verde escuro -->
    <div class="page-header">
      <div class="row items-center no-wrap">
        <q-icon name="tune" size="26px" class="q-mr-sm" style="color: #34d399" />
        <div>
          <div class="text-h5 text-weight-bold">Configurações</div>
          <div class="text-caption" style="color: rgba(255,255,255,0.65)">
            Gestão da plataforma — apenas Super Admin
          </div>
        </div>
      </div>
    </div>

    <div class="q-pa-md">
      <q-card flat bordered>
        <q-tabs
          v-model="tab"
          dense
          no-caps
          align="left"
          active-color="dark"
          indicator-color="green-8"
          class="text-grey-7"
        >
          <q-tab name="superAdmins" label="Super Admins" icon="admin_panel_settings" />
          <q-tab name="planos" label="Planos de Subscrição" icon="payments" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <!-- ══════════ TAB A) SUPER ADMINS ══════════ -->
          <q-tab-panel name="superAdmins" class="q-pa-md">
            <div class="row justify-between items-center q-mb-md">
              <div class="text-subtitle1 text-weight-bold">Super Admins da Plataforma</div>
              <q-btn unelevated color="dark" no-caps icon="person_add" label="Novo Super Admin" @click="openNewSuperAdmin" />
            </div>

            <q-table
              flat
              bordered
              :rows="store.superAdmins"
              :columns="superAdminColumns"
              row-key="id"
              :loading="loadingAdmins"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhum Super Admin registado."
            >
              <template v-slot:body-cell-createdAt="props">
                <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="actions-cell">
                  <q-btn dense flat round icon="delete" color="negative"
                    :disable="Number(props.row.id) === currentUserId"
                    @click="confirmDeleteAdmin(props.row)">
                    <q-tooltip>{{ Number(props.row.id) === currentUserId ? 'Não pode eliminar a sua própria conta' : 'Eliminar' }}</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- ══════════ TAB B) PLANOS DE SUBSCRIÇÃO ══════════ -->
          <q-tab-panel name="planos" class="q-pa-md">
            <div class="row justify-between items-center q-mb-md">
              <div class="text-subtitle1 text-weight-bold">Planos de Subscrição</div>
              <q-btn unelevated color="dark" no-caps icon="add" label="Novo Plano" @click="openPlanDialog()" />
            </div>

            <q-table
              flat
              bordered
              :rows="planStore.plans"
              :columns="planColumns"
              row-key="id"
              :loading="planStore.loading"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhum plano registado."
            >
              <template v-slot:body-cell-price="props">
                <q-td :props="props">{{ formatMzn(props.row.price_mzn) }}</q-td>
              </template>
              <template v-slot:body-cell-popular="props">
                <q-td :props="props">
                  <q-badge v-if="Number(props.row.is_popular) === 1" color="green-8" label="MAIS POPULAR" />
                  <span v-else class="text-grey-5">—</span>
                </q-td>
              </template>
              <template v-slot:body-cell-active="props">
                <q-td :props="props">
                  <q-badge :color="Number(props.row.is_active) === 1 ? 'positive' : 'grey-6'">
                    {{ Number(props.row.is_active) === 1 ? 'ACTIVO' : 'INACTIVO' }}
                  </q-badge>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="actions-cell">
                  <q-btn dense flat round icon="edit" color="primary" @click="openPlanDialog(props.row)">
                    <q-tooltip>Editar</q-tooltip>
                  </q-btn>
                  <q-btn dense flat round icon="block" color="warning"
                    v-if="Number(props.row.is_active) === 1"
                    @click="confirmDeactivatePlan(props.row)">
                    <q-tooltip>Desactivar</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>

    <!-- ══════════ DIALOG: NOVO SUPER ADMIN ══════════ -->
    <q-dialog v-model="showAdminDialog" persistent>
      <q-card style="min-width: 400px; max-width: 92vw">
        <q-card-section class="row items-center" style="background: #0a3d2e; color: white">
          <q-icon name="admin_panel_settings" size="22px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Novo Super Admin</div>
          <q-space />
          <q-btn flat round dense icon="close" text-color="white" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit="submitSuperAdmin" class="q-gutter-sm">
            <q-input v-model="adminForm.name" outlined dense label="Nome *"
              :rules="[v => !!v || 'Campo obrigatório']" />
            <q-input v-model="adminForm.email" outlined dense label="Email *" type="email"
              :rules="[v => !!v || 'Campo obrigatório', v => /.+@.+\..+/.test(v) || 'Email inválido']" />
            <q-input v-model="adminForm.phone" outlined dense label="Telefone" mask="#########" />
            <q-input v-model="adminForm.password" outlined dense label="Senha *" type="password"
              :rules="[v => !!v || 'Campo obrigatório', v => v.length >= 6 || 'Mínimo 6 caracteres']" />
            <q-input v-model="adminForm.confirmPassword" outlined dense label="Confirmar Senha *" type="password"
              :rules="[v => v === adminForm.password || 'As senhas não coincidem']" />
            <q-banner v-if="adminError" class="bg-negative text-white" rounded dense>{{ adminError }}</q-banner>
            <q-card-actions align="right" class="q-pa-none">
              <q-btn flat label="Cancelar" no-caps v-close-popup />
              <q-btn unelevated label="Criar" color="dark" no-caps type="submit" :loading="savingAdmin" />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ══════════ DIALOG: NOVO/EDITAR PLANO ══════════ -->
    <q-dialog v-model="showPlanDialog" persistent>
      <q-card style="min-width: 440px; max-width: 94vw">
        <q-card-section class="row items-center" style="background: #0a3d2e; color: white">
          <q-icon name="payments" size="22px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">{{ editingPlan ? 'Editar Plano' : 'Novo Plano' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" text-color="white" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit="submitPlan" class="q-gutter-sm">
            <q-input v-model="planForm.name" outlined dense label="Nome *"
              :rules="[v => !!v || 'Campo obrigatório']" />
            <q-input v-model="planForm.slug" outlined dense label="Slug *"
              :rules="[v => !!v || 'Campo obrigatório']" />
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model.number="planForm.price_mzn" outlined dense type="number" label="Preço MZN *"
                  :rules="[v => v != null && v > 0 || 'Preço inválido']" />
              </div>
              <div class="col-6">
                <q-input v-model.number="planForm.max_clients" outlined dense type="number" label="Máx. Clientes *"
                  :rules="[v => v != null && v > 0 || 'Valor inválido']" />
              </div>
            </div>

            <div class="text-caption text-grey-6">Features (Enter para adicionar)</div>
            <q-select
              v-model="planForm.features"
              use-input
              use-chips
              multiple
              input-debounce="0"
              outlined
              dense
              label="Features do plano"
              @new-value="addFeature"
            />

            <div class="row q-gutter-sm">
              <q-checkbox v-model="planForm.is_popular" label="Mais Popular" color="green-8" />
              <q-checkbox v-model="planForm.is_active" label="Activo" color="green-8" />
            </div>

            <q-banner v-if="planError" class="bg-negative text-white" rounded dense>{{ planError }}</q-banner>
            <q-card-actions align="right" class="q-pa-none">
              <q-btn flat label="Cancelar" no-caps v-close-popup />
              <q-btn unelevated label="Guardar" color="dark" no-caps type="submit" :loading="savingPlan" />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useSuperAdminStore } from '@/stores/superAdmin'
import { usePlanStore } from '@/stores/plan'
import { useAuthStore } from '@/stores/auth'

const $q = useQuasar()
const store = useSuperAdminStore()
const planStore = usePlanStore()
const authStore = useAuthStore()

const tab = ref('superAdmins')
const loadingAdmins = ref(false)
const currentUserId = computed(() => authStore.user?.id)

// ── Super Admins ──
const showAdminDialog = ref(false)
const savingAdmin = ref(false)
const adminError = ref(null)
const adminForm = ref({ name: '', email: '', phone: '', password: '', confirmPassword: '' })

const superAdminColumns = [
  { name: 'name', label: 'Nome', field: 'name', align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'phone', label: 'Telefone', field: 'phone', align: 'left' },
  { name: 'createdAt', label: 'Data Criação', field: 'createdAt', align: 'left' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

function openNewSuperAdmin() {
  adminForm.value = { name: '', email: '', phone: '', password: '', confirmPassword: '' }
  adminError.value = null
  showAdminDialog.value = true
}

async function submitSuperAdmin() {
  savingAdmin.value = true
  adminError.value = null
  try {
    const result = await store.createSuperAdmin({
      name: adminForm.value.name,
      email: adminForm.value.email,
      phone: adminForm.value.phone,
      password: adminForm.value.password
    })
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Super Admin criado com sucesso.', position: 'top' })
      showAdminDialog.value = false
    } else {
      adminError.value = result.message
    }
  } catch (e) {
    adminError.value = e.response?.data?.message || 'Erro ao criar Super Admin.'
  } finally {
    savingAdmin.value = false
  }
}

function confirmDeleteAdmin(row) {
  $q.dialog({
    title: 'Eliminar Super Admin',
    message: `Eliminar a conta de "${row.name}"? Esta acção não pode ser revertida.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const result = await store.deleteSuperAdmin(row.id)
      if (result.success) {
        $q.notify({ type: 'positive', message: result.message, position: 'top' })
      }
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao eliminar.', position: 'top' })
    }
  })
}

// ── Planos ──
const showPlanDialog = ref(false)
const savingPlan = ref(false)
const planError = ref(null)
const editingPlan = ref(null)
const planForm = ref({
  name: '', slug: '', price_mzn: null, max_clients: null,
  features: [], is_popular: false, is_active: true
})

const planColumns = [
  { name: 'name', label: 'Nome', field: 'name', align: 'left' },
  { name: 'slug', label: 'Slug', field: 'slug', align: 'left' },
  { name: 'price', label: 'Preço', field: 'price_mzn', align: 'right' },
  { name: 'max_clients', label: 'Máx. Clientes', field: 'max_clients', align: 'center' },
  { name: 'popular', label: 'Popular', field: 'is_popular', align: 'center' },
  { name: 'active', label: 'Estado', field: 'is_active', align: 'center' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

function openPlanDialog(plan = null) {
  editingPlan.value = plan
  planForm.value = plan
    ? {
        name: plan.name,
        slug: plan.slug,
        price_mzn: Number(plan.price_mzn),
        max_clients: Number(plan.max_clients),
        features: parseFeatures(plan.features),
        is_popular: Number(plan.is_popular) === 1,
        is_active: Number(plan.is_active) === 1
      }
    : { name: '', slug: '', price_mzn: null, max_clients: null, features: [], is_popular: false, is_active: true }
  planError.value = null
  showPlanDialog.value = true
}

function parseFeatures(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function addFeature(newVal, /* updateFn */) {
  if (newVal && !planForm.value.features.includes(newVal)) {
    planForm.value.features.push(newVal)
  }
  return false // fecha o input (padrão use-input + use-chips)
}

async function submitPlan() {
  savingPlan.value = true
  planError.value = null
  try {
    const result = await planStore.savePlan({
      name: planForm.value.name,
      slug: planForm.value.slug,
      price_mzn: planForm.value.price_mzn,
      max_clients: planForm.value.max_clients,
      features: planForm.value.features,
      is_popular: planForm.value.is_popular,
      is_active: planForm.value.is_active
    }, editingPlan.value?.id || null)
    if (result.success) {
      $q.notify({ type: 'positive', message: result.message, position: 'top' })
      showPlanDialog.value = false
      await planStore.fetchPlans({ all: true })
    } else {
      planError.value = result.message
    }
  } catch (e) {
    planError.value = e.response?.data?.message || 'Erro ao guardar o plano.'
  } finally {
    savingPlan.value = false
  }
}

function confirmDeactivatePlan(row) {
  $q.dialog({
    title: 'Desactivar Plano',
    message: `Desactivar o plano "${row.name}"? Ele deixa de aparecer na landing e no registo.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const result = await planStore.deactivatePlan(row.id)
      if (result.success) {
        $q.notify({ type: 'positive', message: result.message, position: 'top' })
        await planStore.fetchPlans({ all: true })
      }
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao desactivar.', position: 'top' })
    }
  })
}

function formatMzn(value) {
  return `${Number(value || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(async () => {
  loadingAdmins.value = true
  try {
    await store.fetchSuperAdmins()
  } finally {
    loadingAdmins.value = false
  }
  planStore.fetchPlans({ all: true })
})
</script>

<style scoped>
.sa-settings-page {
  background: #f2f7f4;
  min-height: 100vh;
}

.page-header {
  background: #0a3d2e;
  color: white;
  padding: 18px 24px;
}

/* Acções: ícones com espaçamento 0.5cm */
.actions-cell {
  display: flex !important;
  flex-direction: row;
  align-items: center;
  gap: 0.5cm;
}
</style>
