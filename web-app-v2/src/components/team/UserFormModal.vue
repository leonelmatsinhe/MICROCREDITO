<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="close">
    <q-card class="user-form-card">
      <q-card-section class="row items-center dialog-head">
        <q-icon :name="isEditing ? 'edit' : 'person_add'" size="20px" class="q-mr-sm" />
        <div class="text-h6">{{ isEditing ? 'Editar Membro' : 'Novo Membro' }}</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close(false)" />
      </q-card-section>

      <q-card-section class="q-gutter-y-md scroll" style="max-height: 70vh">
        <!-- Secção 1: identificação -->
        <div class="text-subtitle2 text-grey-7">Identificação</div>
        <q-input v-model="form.name" dense outlined label="Nome completo *" :rules="[(v) => !!v || 'Obrigatório']" input-style="font-size: 13px">
          <template v-slot:prepend><q-icon name="person" size="16px" color="grey-5" /></template>
        </q-input>

        <q-input
          v-model="form.email" dense outlined type="email"
          :label="isEditing ? 'E-mail (não alterável)' : 'E-mail *'"
          :disable="isEditing" :rules="isEditing ? [] : [(v) => !!v || 'Obrigatório']"
          input-style="font-size: 13px"
        >
          <template v-slot:prepend><q-icon name="email" size="16px" color="grey-5" /></template>
        </q-input>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="form.phone" dense outlined label="Telefone" mask="#############" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="phone" size="16px" color="grey-5" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.password" dense outlined
              :label="isEditing ? 'Nova senha (opcional)' : 'Senha *'"
              :type="showPassword ? 'text' : 'password'"
              :rules="isEditing ? [] : [(v) => !!v || 'Obrigatório']"
              input-style="font-size: 13px"
            >
              <template v-slot:prepend><q-icon name="lock" size="16px" color="grey-5" /></template>
              <template v-slot:append>
                <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPassword = !showPassword" />
              </template>
            </q-input>
            <div class="row justify-end">
              <q-btn flat dense no-caps size="sm" color="primary" icon="casino" label="Gerar senha" @click="generatePassword" />
            </div>
          </div>
        </div>

        <q-separator />

        <!-- Secção 2: perfil e acesso -->
        <div class="text-subtitle2 text-grey-7">Perfil e acesso</div>
        <q-select
          v-model="form.userRole"
          :options="roleOptions"
          dense outlined emit-value map-options
          label="Perfil de acesso *"
          input-style="font-size: 13px"
          @update:model-value="onRoleChange"
        >
          <template v-slot:prepend><q-icon name="admin_panel_settings" size="16px" color="grey-5" /></template>
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar><q-icon :name="scope.opt.icon" :color="scope.opt.color" /></q-item-section>
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
                <q-item-label caption>{{ scope.opt.hint }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <!-- Campos exclusivos: Parceiro Financiador -->
        <template v-if="isPartner">
          <q-select
            v-model="form.walletId"
            :options="walletOptions"
            dense outlined emit-value map-options
            label="Carteira de financiamento *"
            hint="Só carteiras de parceiro externo com portal activo"
            :rules="[(v) => !isPartner || !!v || 'Selecione a carteira']"
          >
            <template v-slot:prepend><q-icon name="savings" size="16px" color="grey-5" /></template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar><q-badge :color="scope.opt.cor || 'blue'" :label="scope.opt.codigo" /></q-item-section>
                <q-item-section><q-item-label>{{ scope.opt.label }}</q-item-label></q-item-section>
              </q-item>
            </template>
          </q-select>

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.nuit" dense outlined label="NUIT do parceiro (opcional)" input-style="font-size: 13px" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="form.parceiro_contacto" dense outlined label="Contacto da empresa parceira" input-style="font-size: 13px" />
            </div>
          </div>

          <q-banner dense rounded class="bg-blue-1 text-blue-10">
            <template v-slot:avatar><q-icon name="login" /></template>
            O parceiro entra com este e-mail/senha e é encaminhado directamente para o
            <strong>Portal do Financiador</strong>, onde só vê a carteira selecionada (créditos, prestações,
            mora, recebimentos e recibos). Não edita nada, não acede ao painel MBRM nem ao relatório do BM.
          </q-banner>
        </template>

        <q-toggle v-model="form.status" :true-value="1" :false-value="0" label="Conta activa" color="positive" />

        <div v-if="!isEditing" class="text-caption text-grey-5" style="font-size: 11px">
          <q-icon name="info" size="12px" class="q-mr-xs" />
          Sem senha definida, a senha inicial é <strong>123456</strong> — o utilizador deve alterá-la no primeiro acesso.
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat no-caps label="Cancelar" :disable="saving" @click="close(false)" />
        <q-btn unelevated rounded no-caps color="primary" :label="isEditing ? 'Guardar' : 'Criar membro'" :loading="saving" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useWalletsStore } from '@/stores/wallets'
import { logCreateUser, logEditUser, logResetPassword } from '@/utils/logger'

/**
 * FORMULÁRIO ÚNICO DE MEMBRO DA EQUIPA
 * O mesmo formulário cria/edita utilizadores MBRM (Admin/Gestor/Operador) e
 * parceiros financiadores (perfil 4) — o perfil escolhido decide o endpoint e
 * os campos extra (carteira de financiamento obrigatória).
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
  defaultRole: { type: Number, default: 3 }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const walletsStore = useWalletsStore()

const showPassword = ref(false)
const saving = ref(false)

const isEditing = computed(() => !!props.user?.id)
const isPartner = computed(() => Number(form.value.userRole) === 4)
const walletOptions = computed(() => walletsStore.portalWalletOptions)

const roleOptions = computed(() => {
  const base = [
    { label: 'Administrador', value: 1, icon: 'shield', color: 'negative', hint: 'Acesso total à empresa' },
    { label: 'Gestor de Crédito', value: 3, icon: 'support_agent', color: 'teal', hint: 'Acompanha créditos e mutuários' },
    { label: 'Operador', value: 2, icon: 'badge', color: 'blue', hint: 'Operação diária (caixa, pagamentos)' },
    {
      label: 'Parceiro Financiador',
      value: 4,
      icon: 'handshake',
      color: 'deep-purple',
      hint: 'Portal do financiador — só a carteira dele'
    }
  ]
  // Super Admin pode criar outro Super Admin; os restantes não.
  if (Number(authStore.userRole) === 0) {
    base.unshift({ label: 'Super Admin', value: 0, icon: 'workspace_premium', color: 'grey-9', hint: 'Administração da plataforma' })
  }
  return base
})

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  userRole: props.defaultRole,
  walletId: null,
  nuit: '',
  parceiro_contacto: '',
  status: 1
})
const form = ref(emptyForm())

watch(() => props.modelValue, (open) => {
  if (!open) return
  form.value = props.user
    ? {
        name: props.user.name || '',
        email: props.user.email || '',
        phone: props.user.phone || '',
        password: '',
        userRole: Number(props.user.userRole),
        walletId: props.user.walletId || null,
        nuit: props.user.nuit || '',
        parceiro_contacto: props.user.parceiro_contacto || '',
        status: Number(props.user.status ?? props.user.is_active ?? 1) ? 1 : 0
      }
    : { ...emptyForm(), userRole: Number(props.defaultRole), walletId: null, status: 1 }
  showPassword.value = false
})

function onRoleChange(value) {
  if (Number(value) === 4) {
    if (!form.value.walletId && walletOptions.value.length > 0) {
      form.value.walletId = walletOptions.value[0].value
    }
  } else {
    form.value.walletId = null
  }
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let index = 0; index < 10; index += 1) out += chars[Math.floor(Math.random() * chars.length)]
  form.value.password = `${out}@1`
  showPassword.value = true
  $q.notify({ type: 'info', message: 'Senha gerada — copie-a antes de guardar', position: 'top' })
}

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  const f = form.value
  if (!f.name?.trim()) {
    $q.notify({ type: 'warning', message: 'Indique o nome do membro', position: 'top' })
    return
  }
  if (!isEditing.value && !f.email?.trim()) {
    $q.notify({ type: 'warning', message: 'Indique o e-mail de acesso', position: 'top' })
    return
  }
  if (!isEditing.value && !f.password?.trim()) {
    $q.notify({ type: 'warning', message: 'Defina a senha inicial', position: 'top' })
    return
  }
  if (isPartner.value && !f.walletId) {
    $q.notify({ type: 'warning', message: 'Selecione a carteira de financiamento do parceiro', position: 'top' })
    return
  }

  saving.value = true
  try {
    let data
    if (isPartner.value) {
      data = isEditing.value
        ? await walletsStore.updatePartner(props.user.id, {
            name: f.name,
            phone: f.phone,
            walletId: f.walletId,
            password: f.password || undefined,
            is_active: f.status === 1
          })
        : await walletsStore.createPartner({
            companyId: authStore.companyId,
            name: f.name,
            email: f.email,
            password: f.password,
            phone: f.phone,
            walletId: f.walletId,
            nuit: f.nuit || undefined
          })
    } else if (isEditing.value) {
      const payload = { name: f.name, phone: f.phone, userRole: f.userRole, status: f.status }
      data = await settingsStore.updateUser(props.user.id, payload)
      logEditUser(f.name)
    } else {
      data = await settingsStore.createUser({
        name: f.name,
        email: f.email,
        phone: f.phone,
        password: f.password,
        userRole: f.userRole,
        status: f.status,
        companyId: authStore.companyId
      })
      logCreateUser(f.name)
    }

    if (data?.success === false) {
      $q.notify({ type: 'negative', message: data.message || 'Erro ao guardar o membro', position: 'top' })
      return
    }
    $q.notify({
      type: 'positive',
      message: data?.message || (isEditing.value ? 'Membro actualizado' : 'Membro criado'),
      position: 'top'
    })
    emit('saved')
    close()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao guardar o membro',
      position: 'top'
    })
  } finally {
    saving.value = false
  }
}

/** Repõe a senha para 123456 (usado pelo painel de equipa). */
defineExpose({ generatePassword })

// Mantém o Pinia em sincronia quando o painel pede a lista de carteiras.
if (walletsStore.wallets.length === 0 && authStore.companyId) {
  walletsStore.fetchWallets(authStore.companyId).catch(() => {})
}
</script>

<style lang="scss" scoped>
.user-form-card {
  width: 560px;
  max-width: 95vw;
  border-radius: 18px;
}

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}
</style>
