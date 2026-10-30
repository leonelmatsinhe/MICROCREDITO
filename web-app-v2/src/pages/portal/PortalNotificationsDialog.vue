<template>
  <q-dialog v-model="show" persistent>
    <q-card style="border-radius: 16px; width: 100%; max-width: 440px; min-width: 0">
      <q-card-section class="row items-center bg-primary text-white q-py-sm">
        <q-icon name="notifications" size="22px" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-bold">Avisos e Notificações</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="show = false" />
      </q-card-section>

      <q-card-section class="q-pa-none" style="max-height: 65vh; overflow-y: auto">
        <div v-if="loading" class="text-center q-pa-lg">
          <q-spinner-dots size="32px" color="primary" />
          <div class="text-caption text-grey-6 q-mt-xs">A carregar avisos...</div>
        </div>

        <div v-else-if="notifications.length === 0" class="text-center text-grey-6 q-pa-xl">
          <q-icon name="notifications_off" size="48px" color="grey-4" />
          <div class="text-subtitle2 q-mt-sm">Nenhuma notificação</div>
          <div class="text-caption text-grey-5">Avisos de pagamentos e cobranças aparecerão aqui.</div>
        </div>

        <q-list v-else separator>
          <q-item
            v-for="notif in notifications"
            :key="notif.id"
            :class="{ 'bg-blue-1': !notif.isRead }"
            class="q-py-sm"
          >
            <q-item-section avatar top>
              <q-avatar
                size="34px"
                :color="getNotificationColor(notif.type)"
                text-color="white"
              >
                <q-icon :name="getNotificationIcon(notif.type)" size="18px" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-weight-bold" style="font-size: 13px">
                {{ notif.title || 'Aviso do Sistema' }}
              </q-item-label>
              <q-item-label caption class="text-grey-8" style="line-height: 1.4">
                {{ notif.message }}
              </q-item-label>
              <q-item-label caption class="text-grey-5 q-mt-xs" style="font-size: 10px">
                {{ formatDate(notif.createdAt) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <q-card-actions align="between" class="q-pa-sm bg-grey-1">
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          label="Marcar lidas"
          icon="done_all"
          :disable="notifications.length === 0"
          @click="markAllAsRead"
        />
        <q-btn flat label="Fechar" color="grey-8" no-caps @click="show = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()

const show = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const notifications = ref([])

watch(() => props.modelValue, open => {
  if (open) fetchNotifications()
})

async function fetchNotifications() {
  const user = authStore.user
  if (!user?.companyId || !user?.id) return

  loading.value = true
  try {
    const { data } = await api.get(`/api/notifications/customer/${user.companyId}/${user.id}`)
    if (data.success && Array.isArray(data.result)) {
      notifications.value = data.result
    } else {
      notifications.value = []
    }
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    notifications.value = []
  } finally {
    loading.value = false
  }
}

async function markAllAsRead() {
  const user = authStore.user
  if (!user?.companyId || !user?.id) return

  try {
    await api.put(`/api/notifications/customer/markAllRead/${user.companyId}/${user.id}`)
    notifications.value.forEach(n => { n.isRead = true })
  } catch (err) {
    console.error('Erro ao marcar notificações:', err)
  }
}

function getNotificationColor(type) {
  if (type === 'payment_received') return 'positive'
  if (type === 'overdue' || type === 'late') return 'negative'
  if (type === 'loan_request') return 'orange'
  return 'primary'
}

function getNotificationIcon(type) {
  if (type === 'payment_received') return 'payments'
  if (type === 'overdue' || type === 'late') return 'warning'
  if (type === 'loan_request') return 'assignment'
  return 'info'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-MZ') + ' ' + d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}
</script>
