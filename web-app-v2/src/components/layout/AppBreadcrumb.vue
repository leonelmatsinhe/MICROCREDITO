<template>
  <q-breadcrumbs class="app-breadcrumbs">
    <q-breadcrumbs-el icon="home" to="/" />
    <q-breadcrumbs-el
      v-for="crumb in breadcrumbs"
      :key="crumb.path"
      :label="crumb.label"
      :to="crumb.path"
    />
  </q-breadcrumbs>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbs = computed(() => {
  const crumbs = []
  const matched = route.matched

  matched.forEach((record) => {
    if (record.meta?.breadcrumb) {
      crumbs.push({
        label: record.meta.breadcrumb,
        path: record.path
      })
    } else if (record.name) {
      const label = getRouteLabel(record.name)
      if (label) {
        crumbs.push({
          label,
          path: record.path
        })
      }
    }
  })

  return crumbs
})

function getRouteLabel(name) {
  const labels = {
    Dashboard: 'Painel',
    Gestor: 'Painel do Gestor',
    Company: 'Painel da Empresa',
    CustomerList: 'Mutuários',
    CustomerDetail: 'Detalhe do Mutuário',
    LoanList: 'Créditos',
    LoanDetail: 'Detalhe do Crédito',
    LoanDocuments: 'Documentos do Crédito',
    Loans: 'Créditos',
    Payments: 'Pagamentos',
    Installments: 'Prestações',
    Reports: 'Relatórios',
    Settings: 'Configurações',
    Profile: 'Meu Perfil',
    Notifications: 'Notificações',
    CustomerPortal: 'Meu Painel',
    SmsPendingCredentials: 'Centro de Mensagens',
    Logs: 'Histórico do Sistema',
    OnboardingTeam: 'Onboarding da Equipa',
    InstallmentsControl: 'Controle de Prestações',
    ReportsBM: 'Relatório Banco de Moçambique',
    FinancingWallets: 'Carteiras de Financiamento',
    PartnerUsers: 'Parceiros Financiadores',
    FinancierReports: 'Relatório de Financiadores',
    PartnerDashboard: 'Painel da Carteira',
    PartnerCreditos: 'Créditos Desembolsados',
    PartnerPrestacoesPagas: 'Prestações Pagas',
    PartnerPrestacoesPendentes: 'Prestações Pendentes',
    PartnerMora: 'Juros de Mora',
    PartnerRecebimentos: 'Recebimentos',
    PartnerExtrato: 'Extracto da Carteira',
    PartnerRecibos: 'Recibos'
  }
  return labels[name] || name
}
</script>

<style lang="scss" scoped>
.app-breadcrumbs {
  font-size: 11px;
  color: #64748b;

  :deep(.q-breadcrumbs__el) {
    color: #64748b;
    transition: color 0.15s ease;

    &:hover {
      color: #0D7C3D;
    }
  }

  :deep(.q-breadcrumbs__separator) {
    color: #94a3b8;
  }
}

body.body--dark .app-breadcrumbs {
  color: #94a3b8;

  :deep(.q-breadcrumbs__el) {
    color: #94a3b8;

    &:hover {
      color: #4ade80;
    }
  }

  :deep(.q-breadcrumbs__separator) {
    color: #64748b;
  }
}
</style>
