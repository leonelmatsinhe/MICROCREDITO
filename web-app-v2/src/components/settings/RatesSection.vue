<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Taxas de Juro</div>
        <div class="text-caption text-grey-5">Configurar as taxas aplicadas aos créditos</div>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="add" label="Nova Taxa" unelevated no-caps rounded size="sm" @click="openCreate" />
      </div>
    </div>

    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <div v-else-if="rates.length === 0" class="text-center q-pa-xl">
      <q-icon name="percent" size="48px" color="grey-4" />
      <div class="text-subtitle1 text-grey-6 q-mt-sm">Nenhuma taxa registada</div>
      <q-btn color="primary" label="Criar Primeira Taxa" unelevated no-caps rounded size="sm" class="q-mt-md" @click="openCreate" />
    </div>

    <div v-else class="row q-col-gutter-md">
      <div v-for="rate in rates" :key="rate.id" class="col-12 col-sm-6 col-lg-4">
        <q-card flat bordered style="border-radius: 12px" class="rate-card">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="rate-icon">
                <q-icon name="percent" size="24px" color="primary" />
              </div>
              <q-space />
              <q-btn flat round dense icon="more_vert" size="sm">
                <q-menu>
                  <q-list style="min-width: 140px">
                    <q-item clickable v-close-popup @click="openEdit(rate)">
                      <q-item-section avatar><q-icon name="edit" size="16px" color="grey-7" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="confirmDelete(rate)">
                      <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                      <q-item-section class="text-negative" style="font-size: 13px">Eliminar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>

            <div class="text-h4 text-weight-bold text-primary">{{ (rate.tax * 100).toFixed(1) }}<span style="font-size: 18px">%</span></div>
            <div class="text-caption text-grey-6 q-mt-xs">{{ rate.name || 'Taxa de juro' }}</div>

            <div class="text-caption text-grey-5 q-mt-xs" v-if="rate.administrativeFee">
              <q-icon name="receipt" size="12px" class="q-mr-xs" />
              Taxa administrativa: {{ (rate.administrativeFee * 100).toFixed(1) }}%
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Form Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 380px; border-radius: 12px">
        <q-card-section class="bg-primary text-white row items-center" style="border-radius: 12px 12px 0 0">
          <q-icon :name="editingRate ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ editingRate ? 'Editar Taxa' : 'Nova Taxa' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeForm" />
        </q-card-section>
        <q-card-section>
          <q-form @submit="saveRate" class="q-gutter-md">
            <q-input v-model="form.name" dense outlined label="Nome / Descrição *" :rules="[val => !!val || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="label" size="16px" color="grey-5" /></template>
            </q-input>
            <q-input v-model.number="form.taxPercent" dense outlined label="Taxa de Juro (%) *" type="number" step="0.1" :rules="[val => !!val || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="percent" size="16px" color="grey-5" /></template>
            </q-input>
            <q-input v-model.number="form.adminFeePercent" dense outlined label="Taxa Administrativa (%)" type="number" step="0.1" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="receipt" size="16px" color="grey-5" /></template>
            </q-input>
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Cancelar" color="grey" @click="closeForm" no-caps />
              <q-btn type="submit" unelevated :label="editingRate ? 'Salvar' : 'Criar'" color="primary" :loading="saving" no-caps rounded />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 300px">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md">Eliminar Taxa</div>
          <div class="text-body2 text-grey-6 q-mt-sm">Tem certeza?</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup no-caps />
          <q-btn unelevated label="Eliminar" color="negative" :loading="saving" @click="deleteRateConfirmed" v-close-popup no-caps rounded />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { logUpdateRates } from '@/utils/logger'

const $q = useQuasar()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const loading = computed(() => settingsStore.loadingRates)
const saving = computed(() => settingsStore.saving)
const rates = computed(() => settingsStore.rates)

const showForm = ref(false)
const showDeleteConfirm = ref(false)
const editingRate = ref(null)
const deletingRate = ref(null)
const form = ref({ name: '', taxPercent: '', adminFeePercent: 0 })

function openCreate() {
  editingRate.value = null
  form.value = { name: '', taxPercent: '', adminFeePercent: 0 }
  showForm.value = true
}

function openEdit(rate) {
  editingRate.value = rate
  form.value = {
    name: rate.name || '',
    taxPercent: rate.tax * 100,
    adminFeePercent: (rate.administrativeFee || 0) * 100
  }
  showForm.value = true
}

function closeForm() { showForm.value = false; editingRate.value = null }
function confirmDelete(rate) { deletingRate.value = rate; showDeleteConfirm.value = true }

async function saveRate() {
  try {
    const payload = {
      name: form.value.name,
      tax: form.value.taxPercent / 100,
      administrativeFee: (form.value.adminFeePercent || 0) / 100,
      companyId: authStore.companyId
    }
    if (editingRate.value) {
      await settingsStore.updateRate(editingRate.value.id, payload)
      logUpdateRates()
      $q.notify({ type: 'positive', message: 'Taxa atualizada', position: 'top' })
    } else {
      await settingsStore.createRate(payload)
      logUpdateRates()
      $q.notify({ type: 'positive', message: 'Taxa criada', position: 'top' })
    }
    closeForm()
    settingsStore.fetchRates(authStore.companyId)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro', position: 'top' })
  }
}

async function deleteRateConfirmed() {
  try {
    await settingsStore.deleteRate(deletingRate.value.id)
    $q.notify({ type: 'positive', message: 'Taxa eliminada', position: 'top' })
    settingsStore.fetchRates(authStore.companyId)
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
  }
}

onMounted(() => { settingsStore.fetchRates(authStore.companyId) })
</script>

<style lang="scss" scoped>
.rate-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba($primary, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rate-card {
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}
</style>
