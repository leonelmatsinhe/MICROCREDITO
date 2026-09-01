<template>
  <q-breadcrumbs class="text-grey-6" style="font-size: 12px">
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
    Loans: 'Créditos',
    LoanDetail: 'Detalhe do Crédito',
    Payments: 'Pagamentos',
    Installments: 'Prestações',
    Reports: 'Relatórios',
    Settings: 'Configurações',
    Profile: 'Meu Perfil',
    Notifications: 'Notificações',
    CustomerPortal: 'Meu Painel'
  }
  return labels[name] || name
}
</script>
