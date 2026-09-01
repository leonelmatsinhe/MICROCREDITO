<template>
  <div class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Detalhe do Crédito</div>
        <div class="text-caption text-grey-5" v-if="loan">
          Conta {{ loan.accountNumber }}
        </div>
      </div>
      <div class="col-auto">
        <q-btn flat icon="arrow_back" label="Voltar" no-caps @click="router.back()" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else-if="loan">
      <div class="row q-col-gutter-md">
        <!-- Loan Info -->
        <div class="col-12 col-md-6">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">
                <q-icon name="info" size="18px" class="q-mr-xs" />
                Informações do Crédito
              </div>

              <div class="q-gutter-md">
                <div class="row">
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Estado</div>
                    <q-badge
                      :color="getStatusColor(loan.status)"
                      :label="getStatusText(loan.status)"
                      rounded
                    />
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Data de Criação</div>
                    <div class="text-weight-medium">{{ loan.dateCreated }}</div>
                  </div>
                </div>

                <q-separator />

                <div class="row">
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Montante</div>
                    <div class="text-weight-bold text-primary" style="font-size: 20px">
                      {{ formatMoney(loan.amount) }}
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Taxa de Juros</div>
                    <div class="text-weight-bold" style="font-size: 20px">
                      {{ (loan.interestRate * 100).toFixed(1) }}%
                    </div>
                  </div>
                </div>

                <q-separator />

                <div class="row">
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Nº Prestações</div>
                    <div class="text-weight-medium">{{ loan.numberOfInstallments }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Gestor</div>
                    <div class="text-weight-medium">Gestor #{{ loan.creditManager }}</div>
                  </div>
                </div>

                <div v-if="loan.loanDescription">
                  <q-separator />
                  <div class="text-caption text-grey-5">Descrição</div>
                  <div class="text-body2">{{ loan.loanDescription }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Actions -->
        <div class="col-12 col-md-6">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">
                <q-icon name="build" size="18px" class="q-mr-xs" />
                Acções
              </div>

              <div class="q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="receipt"
                  label="Ver Plano de Amortização"
                  class="full-width"
                  no-caps
                  rounded
                  @click="router.push(`/loans/${loan.id}/amortization`)"
                />

                <q-btn
                  v-if="loan.status === 0"
                  unelevated
                  color="positive"
                  icon="check_circle"
                  label="Aprovar Crédito"
                  class="full-width"
                  no-caps
                  rounded
                  @click="approveLoan"
                />

                <q-btn
                  v-if="loan.status === 0"
                  unelevated
                  color="negative"
                  icon="cancel"
                  label="Rejeitar Crédito"
                  class="full-width"
                  no-caps
                  rounded
                  @click="rejectLoan"
                />

                <q-btn
                  v-if="loan.status === 1"
                  unelevated
                  color="teal"
                  icon="payments"
                  label="Registar Pagamento"
                  class="full-width"
                  no-caps
                  rounded
                  @click="registerPayment"
                />

                <!-- Documentos (apenas para créditos activos) -->
                <template v-if="loan.status === 1">
                  <q-separator class="q-my-sm" />
                  <div class="text-caption text-grey-5 q-mb-xs">Documentos</div>

                  <q-btn
                    unelevated
                    color="primary"
                    icon="description"
                    label="Gerar Documentos"
                    class="full-width"
                    no-caps
                    rounded
                    @click="goToDocuments"
                  />
                </template>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLoansStore } from '@/stores/loans'
import { useAuthStore } from '@/stores/auth'
import { formatMoney } from '@/utils/formatters'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const loansStore = useLoansStore()
const authStore = useAuthStore()

const loading = computed(() => loansStore.loading)
const loan = computed(() => loansStore.currentLoan)

function getStatusColor(status) {
  const colors = { 0: 'orange', 1: 'positive', '-1': 'negative', 3: 'grey' }
  return colors[status] || 'grey'
}

function getStatusText(status) {
  const texts = { 0: 'Pendente', 1: 'Activo', '-1': 'Rejeitado', 3: 'Terminado' }
  return texts[status] || 'Desconhecido'
}

async function approveLoan() {
  $q.dialog({
    title: 'Aprovar Crédito',
    message: 'Tem certeza que deseja aprovar este crédito?',
    cancel: 'Não',
    ok: { label: 'Sim, aprovar', color: 'positive' },
    persistent: true
  }).onOk(async () => {
    try {
      await loansStore.updateLoan(loan.value.id, { ...loan.value, status: 1 })
      $q.notify({ type: 'positive', message: 'Crédito aprovado', position: 'top' })
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Erro ao aprovar', position: 'top' })
    }
  })
}

async function rejectLoan() {
  $q.dialog({
    title: 'Rejeitar Crédito',
    message: 'Tem certeza que deseja rejeitar este crédito?',
    cancel: 'Não',
    ok: { label: 'Sim, rejeitar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await loansStore.updateLoan(loan.value.id, { ...loan.value, status: -1 })
      $q.notify({ type: 'warning', message: 'Crédito rejeitado', position: 'top' })
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Erro ao rejeitar', position: 'top' })
    }
  })
}

function registerPayment() {
  $q.notify({ type: 'info', message: 'Funcionalidade em desenvolvimento', position: 'top' })
}

function goToDocuments() {
  router.push(`/loans/${loan.value.id}/documents`)
}

onMounted(async () => {
  const loanId = route.params.id
  if (loanId) {
    await loansStore.fetchLoan(loanId, authStore.companyId)
  }
})
</script>
