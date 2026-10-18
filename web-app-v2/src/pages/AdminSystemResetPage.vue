<template>
  <q-page padding>
    <div class="q-pa-md" style="max-width: 980px; margin: 0 auto">
      <!-- Cabeçalho -->
      <div class="row items-center q-mb-md" data-tour="reset-header">
        <q-avatar color="negative" text-color="white" size="48px">
          <q-icon name="warning" size="28px" />
        </q-avatar>
        <div class="q-ml-md">
          <div class="text-h5 text-weight-bold">Administração do Sistema</div>
          <div class="text-caption text-grey-7">
            Zona de Perigo — operações irreversíveis sobre a base de dados
          </div>
        </div>
      </div>

      <!-- Indisponível (multi-empresa / sem privilégio) -->
      <q-banner v-if="!available && !loading" class="bg-warning text-white q-mb-md" rounded dense>
        <template v-slot:avatar>
          <q-icon name="block" size="20px" />
        </template>
        {{ unavailableReason }}
      </q-banner>

      <q-card flat bordered class="q-mb-lg">
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">
            <q-icon name="dangerous" class="q-mr-sm" />
            Reset Geral de Dados Operacionais
          </div>
          <div class="text-caption" style="opacity: 0.92">
            Apaga todos os mutuários, créditos, prestações, pagamentos e recibos.
            A instituição, os utilizadores e as contas financeiras são preservados.
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-sm" data-tour="reset-deleted">
            Isto será <span class="text-negative">APAGADO</span> (não pode ser desfeito)
          </div>
          <q-list dense>
            <q-item v-for="t in preview.deleted" :key="t.table" dense>
              <q-item-section avatar>
                <q-icon name="delete_forever" color="negative" size="18px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ t.label }}</q-item-label>
                <q-item-label caption class="text-grey-6">{{ t.table }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="t.rows > 0 ? 'negative' : 'grey-5'" :label="`${t.rows} registo(s)`" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator spaced />

          <div class="text-subtitle1 text-weight-bold q-mb-sm q-mt-sm" data-tour="reset-zeroed">
            Isto será <span class="text-amber-8">MANTIDO com saldos zerados</span>
          </div>
          <q-list dense>
            <q-item v-for="t in preview.zeroed" :key="t.table" dense>
              <q-item-section avatar>
                <q-icon name="account_balance_wallet" color="amber-8" size="18px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ t.label }}</q-item-label>
                <q-item-label caption class="text-grey-6">{{ t.table }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="amber-8" :label="`${t.rows ?? 0} registo(s)`" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator spaced />

          <div class="text-subtitle1 text-weight-bold q-mb-sm q-mt-sm" data-tour="reset-kept">
            Isto <span class="text-positive">CONTINUA EXACTAMENTE COMO ESTÁ</span>
          </div>
          <q-list dense>
            <q-item v-for="t in preview.kept" :key="t.table" dense>
              <q-item-section avatar>
                <q-icon name="check_circle" color="positive" size="18px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ t.label }}</q-item-label>
                <q-item-label caption class="text-grey-6">{{ t.table }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="positive" :label="`${t.rows ?? 0} registo(s)`" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-separator />

        <q-card-section class="row items-center justify-between q-gutter-sm" data-tour="reset-button">
          <div class="text-caption text-grey-7">
            <q-icon name="savings" size="16px" class="q-mr-xs" />
            Antes de apagar, o servidor gera um backup SQL em
            <code>/backups/backup_pre_reset_*.sql</code> e regista a operação (quem, quando, IP).
          </div>
          <q-btn
            color="negative"
            icon="dangerous"
            label="Resetar Todos Dados Operacionais"
            unelevated
            :disable="!available"
            @click="openConfirm"
          />
        </q-card-section>
      </q-card>
    </div>

    <!-- ============ MODAL DE CONFIRMAÇÃO (4 CAMADAS DE SEGURANÇA) ============ -->
    <q-dialog v-model="showConfirm" persistent backdrop-filter="blur(4px)">
      <q-card style="min-width: 460px; max-width: 560px">
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">
            <q-icon name="warning_amber" class="q-mr-sm" />
            ATENÇÃO: AÇÃO IRREVERSÍVEL
          </div>
        </q-card-section>

        <q-card-section>
          <p class="text-body1">
            <strong>
              ATENÇÃO: Esta ação é IRREVERSÍVEL e apagará todos os mutuários, créditos e
              pagamentos. Esta ação não pode ser desfeita.
            </strong>
          </p>
          <p class="text-caption text-grey-7 q-mb-none">
            Serão apagados <strong>{{ preview.totalRecords }} registo(s)</strong> em
            {{ preview.deleted.length }} tabelas. Os recibos voltam ao nº 1. Um backup SQL é
            gravado em <code>/backups/</code> antes da apagão.
          </p>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <!-- Camada 2 — palavra de confirmação -->
          <q-input
            v-model="confirmWord"
            outlined
            dense
            label='Escreva "RESETAR" para confirmar'
            placeholder="RESETAR"
            autocomplete="off"
          >
            <template v-slot:prepend>
              <q-icon name="keyboard" color="grey-6" size="18px" />
            </template>
          </q-input>

          <!-- Camada 3 — senha do Admin -->
          <q-input
            v-model="password"
            outlined
            dense
            type="password"
            label="Senha do Administrador"
            autocomplete="new-password"
            @keyup.enter="canConfirm && executeReset()"
          >
            <template v-slot:prepend>
              <q-icon name="lock" color="grey-6" size="18px" />
            </template>
          </q-input>

          <q-banner v-if="errorMessage" class="bg-negative text-white" rounded dense>
            <template v-slot:avatar>
              <q-icon name="error" size="18px" />
            </template>
            <span style="font-size: 12px">{{ errorMessage }}</span>
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey-8" v-close-popup :disable="saving" @click="resetForm" />
          <q-btn
            color="negative"
            icon="dangerous"
            label="APAGAR TUDO"
            unelevated
            :disable="!canConfirm"
            :loading="saving"
            @click="executeReset"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
/**
 * ZONA DE PERIGO — RESET GERAL DE DADOS OPERACIONAIS
 * =================================================
 * Configurações → Administração do Sistema → Zona de Perigo.
 * Visível apenas ao Admin (role 1) e só em instalação single-tenant — o
 * backend valida as duas condições em /api/admin/system/reset-status e
 * recusa a executação em /api/admin/system/reset-operational-data.
 *
 * Quatro camadas de segurança:
 *  1. modal de aviso explícito (IRREVERSÍVEL);
 *  2. digitação manual da palavra "RESETAR" (botão só activa com o texto exacto);
 *  3. senha do Admin re-introduzida (verificada no backend com bcrypt.compare);
 *  4. backup SQL gerado pelo servidor + registo em audit_logs (antes de apagar).
 *
 * Após sucesso: logout automático e redirect para /login com mensagem de
 * sucesso ("Sistema resetado com sucesso - Recibos iniciarão do nº 1").
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import {
  clearResetFacts,
  resetFactsLoading,
  setResetFacts,
  setResetFactsUnavailable
} from '@/data/tourFacts'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(true)
const available = ref(false)
const unavailableReason = ref('')

const preview = ref({ deleted: [], zeroed: [], kept: [], totalRecords: 0 })

const showConfirm = ref(false)
const confirmWord = ref('')
const password = ref('')
const saving = ref(false)
const errorMessage = ref(null)

// Camada 2: o botão só activa com a palavra exacta "RESETAR" + senha preenchida.
const canConfirm = computed(
  () => confirmWord.value.trim().toUpperCase() === 'RESETAR' && password.value.length > 0
)

function resetForm() {
  confirmWord.value = ''
  password.value = ''
  errorMessage.value = null
}

function openConfirm() {
  resetForm()
  showConfirm.value = true
}

async function loadStatus() {
  loading.value = true
  // O tour cita estas contagens: enquanto o servidor não responder, os passos
  // esperam em vez de mostrar números inventados.
  resetFactsLoading()
  try {
    const { data } = await api.get('/api/admin/system/reset-status')
    if (data.success) {
      available.value = true
      preview.value = data.result
      setResetFacts(data.result)
    } else {
      unavailableReason.value = data.message || 'Reset indisponível.'
      setResetFactsUnavailable(unavailableReason.value, { blocked: true })
    }
  } catch (e) {
    const status = e?.response?.status
    const message = e?.response?.data?.message
    if (status === 403) {
      unavailableReason.value =
        message ||
        'O Reset Geral só está disponível em instalações single-tenant e para o Administrador.'
    } else {
      unavailableReason.value = message || 'Não foi possível verificar a disponibilidade do reset.'
    }
    setResetFactsUnavailable(unavailableReason.value, { blocked: status === 403 })
  } finally {
    loading.value = false
  }
}

async function executeReset() {
  if (!canConfirm.value || saving.value) return
  errorMessage.value = null
  saving.value = true
  try {
    const { data } = await api.post('/api/admin/system/reset-operational-data', {
      confirmWord: confirmWord.value.trim().toUpperCase(),
      password: password.value
    })
    if (data.success) {
      showConfirm.value = false
      $q.notify({
        type: 'positive',
        message: 'Sistema resetado com sucesso — Recibos iniciarão do nº 1',
        position: 'top',
        timeout: 6000
      })
      // Logout automático + redirect para o login com a mensagem de sucesso.
      authStore.logout()
      router.push({ path: '/', query: { reset: '1' } })
    } else {
      errorMessage.value = data.message || 'O reset falhou.'
    }
  } catch (e) {
    errorMessage.value =
      e?.response?.data?.message || 'O reset falhou. Nenhum dado foi alterado (rollback).'
  } finally {
    saving.value = false
  }
}

onMounted(loadStatus)

// Sair da página limpa as contagens: o tour nunca cita números de outra visita.
onUnmounted(clearResetFacts)
</script>

<style lang="scss" scoped>
code {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
