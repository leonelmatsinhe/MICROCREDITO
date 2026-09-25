<template>
  <div class="validar-page">
    <div class="validar-bg" />
    <q-card class="validar-card" flat>
      <!-- ═══════ CABEÇALHO ═══════ -->
      <q-card-section class="validar-head" :class="estadoClass">
        <div class="row items-center no-wrap">
          <div class="head-icon q-mr-md">
            <q-icon :name="iconName" size="30px" color="white" />
          </div>
          <div class="col" style="min-width: 0">
            <div class="text-h6 text-weight-bold">{{ titulo }}</div>
            <div class="text-caption">{{ subtitulo }}</div>
          </div>
        </div>
      </q-card-section>

      <!-- ═══════ CARREGAMENTO ═══════ -->
      <q-card-section v-if="loading" class="text-center q-pa-xl">
        <q-spinner-dots size="42px" color="primary" />
        <div class="text-caption text-grey-6 q-mt-md">A validar o selo electrónico do recibo…</div>
      </q-card-section>

      <!-- ═══════ RESULTADO ═══════ -->
      <template v-else-if="resultado">
        <q-card-section class="q-pt-md">
          <div class="row q-col-gutter-sm">
            <div v-for="item in detalhes" :key="item.label" class="col-12 col-sm-6">
              <div class="detail-tile">
                <div class="text-caption text-grey-6">{{ item.label }}</div>
                <div class="text-body2 text-weight-medium">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <q-banner dense rounded class="q-mt-md" :class="valido ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
            <template v-slot:avatar>
              <q-icon :name="valido ? 'verified' : 'gpp_bad'" :color="valido ? 'green-8' : 'red-8'" />
            </template>
            {{ mensagem }}
          </q-banner>

          <div class="hash-box q-mt-md">
            <div class="text-caption text-grey-6">Hash SHA-256 do recibo</div>
            <div class="hash-value">{{ resultado.hash_at }}</div>
          </div>

          <div v-if="resultado.emitente" class="text-caption text-grey-6 q-mt-md">
            Emitente: <strong>{{ resultado.emitente.nome }}</strong> · NUIT {{ resultado.emitente.nuit }} ·
            {{ resultado.emitente.endereco }}
          </div>
          <div class="text-caption text-grey-6">
            Selo: {{ resultado.software_certification }} · Código de validação {{ resultado.at_validation_code || '—' }}
          </div>
        </q-card-section>

        <q-card-actions align="center" class="q-pb-lg">
          <q-btn
            v-if="valido"
            outline
            rounded
            no-caps
            color="primary"
            icon="picture_as_pdf"
            label="Ver recibo em PDF"
            @click="abrirPdf"
          >
            <q-tooltip>Requer sessão iniciada na plataforma MBRM</q-tooltip>
          </q-btn>
          <q-btn flat rounded no-caps color="grey-7" icon="refresh" label="Validar outro" @click="limpar" />
        </q-card-actions>
      </template>

      <!-- ═══════ ERRO / SEM PARÂMETROS ═══════ -->
      <template v-else>
        <q-card-section class="q-pa-lg">
          <div class="text-body2 text-grey-8">{{ mensagem }}</div>
          <q-input
            v-model="numeroManual"
            dense
            outlined
            class="q-mt-md"
            label="Número do recibo (ex.: REC-2026-00001)"
          >
            <template v-slot:prepend><q-icon name="tag" size="16px" /></template>
          </q-input>
          <q-input v-model="hashManual" dense outlined class="q-mt-sm" label="Hash SHA-256 (opcional)">
            <template v-slot:prepend><q-icon name="fingerprint" size="16px" /></template>
          </q-input>
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            label="Validar recibo"
            class="q-mt-md"
            :disable="!numeroManual && !hashManual"
            @click="validar({ rec: numeroManual, hash: hashManual })"
          />
        </q-card-section>
      </template>

      <q-separator />
      <div class="text-caption text-grey-6 text-center q-pa-sm">
        {{ empresa }} · validação pública de recibos emitidos electronicamente (AT Moçambique)
      </div>
    </q-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/boot/axios'

/**
 * PÁGINA PÚBLICA DE VALIDAÇÃO DO RECIBO (`/validar?rec=…&hash=…`)
 * É o destino do QR Code impresso no recibo: confirma o hash SHA-256 e mostra
 * o resumo do documento sem exigir sessão.
 */
const route = useRoute()

const loading = ref(false)
const resultado = ref(null)
const valido = ref(false)
const mensagem = ref('')
const numeroManual = ref('')
const hashManual = ref('')

const detalhes = computed(() => {
  const r = resultado.value
  if (!r) return []
  const data = r.emitido_em ? new Date(r.emitido_em) : null
  const fmt = (value) =>
    `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
  return [
    { label: 'Número do recibo', value: r.numero },
    { label: 'Código de validação', value: r.at_validation_code || '—' },
    { label: 'Data de emissão', value: data ? data.toLocaleString('pt-PT') : '—' },
    { label: 'Mutuário', value: r.cliente || '—' },
    { label: 'Crédito n.º', value: r.credito ?? '—' },
    { label: 'Carteira de financiamento', value: r.carteira || 'Sem carteira atribuída' },
    { label: 'Método de pagamento', value: r.metodo_pagamento || '—' },
    { label: 'Referência', value: r.referencia || '—' },
    { label: 'Valor pago', value: fmt(r.valor_pago) },
    { label: 'Capital', value: fmt(r.valor_capital) },
    { label: 'Juros', value: fmt(r.valor_juros) },
    { label: 'Saldo devedor após o pagamento', value: fmt(r.saldo_restante) }
  ]
})

const empresa = computed(() => resultado.value?.emitente?.nome || 'Mais Mola')

const titulo = computed(() => {
  if (loading.value) return 'A validar recibo…'
  if (resultado.value) return valido.value ? 'RECIBO VÁLIDO' : 'RECIBO NÃO CONFIRMADO'
  return 'Validação de recibo'
})

const subtitulo = computed(() => {
  if (loading.value) return 'Consulta ao registo da Autoridade Tributária (MBRM)'
  if (resultado.value) return `${resultado.value.numero} · ${resultado.value.software_certification || ''}`
  return 'Introduza o número do recibo ou o hash impresso no documento'
})

const iconName = computed(() => {
  if (loading.value) return 'hourglass_top'
  if (resultado.value) return valido.value ? 'verified' : 'gpp_maybe'
  return 'fingerprint'
})

const estadoClass = computed(() => {
  if (loading.value || !resultado.value) return 'head-neutral'
  return valido.value ? 'head-valid' : 'head-invalid'
})

async function validar({ rec, hash } = {}) {
  const numero = String(rec || '').trim()
  const digest = String(hash || '').trim()
  if (!numero && !digest) {
    mensagem.value = 'Indique o número do recibo ou o hash para validar.'
    resultado.value = null
    return
  }

  loading.value = true
  resultado.value = null
  try {
    const params = new URLSearchParams()
    if (numero) params.set('rec', numero)
    if (digest) params.set('hash', digest)
    const { data } = await api.get(`/api/recibos/validar?${params.toString()}`)
    resultado.value = data.result || null
    valido.value = Boolean(data.valido)
    mensagem.value = data.message || (data.valido ? 'Recibo válido.' : 'Recibo não confirmado.')
  } catch (error) {
    const data = error.response?.data
    resultado.value = data?.result || null
    valido.value = false
    mensagem.value =
      data?.message
      || 'Não foi possível validar o recibo. Confirme o número/hash impressos no documento.'
  } finally {
    loading.value = false
  }
}

function limpar() {
  resultado.value = null
  valido.value = false
  mensagem.value = ''
  numeroManual.value = ''
  hashManual.value = ''
  if (typeof window !== 'undefined') window.history.replaceState({}, '', '/validar')
}

function abrirPdf() {
  // Requer sessão da plataforma: abre a área de recibos do crédito.
  window.location.href = `/loans?recibo=${encodeURIComponent(resultado.value?.numero || '')}`
}

onMounted(() => {
  const rec = route.query.rec || route.query.numero || ''
  const hash = route.query.hash || route.query.h || ''
  if (rec || hash) validar({ rec, hash })
  else mensagem.value = 'Introduza os dados impressos no recibo para confirmar a autenticidade.'
})
</script>

<style lang="scss" scoped>
.validar-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, #0f172a 0%, #0b4f23 100%);
  position: relative;
  overflow: hidden;
}

.validar-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 20%, rgba(22, 163, 74, 0.35), transparent 55%),
    radial-gradient(circle at 85% 80%, rgba(37, 99, 235, 0.25), transparent 55%);
}

.validar-card {
  width: 640px;
  max-width: 96vw;
  border-radius: 22px;
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.validar-head {
  color: #fff;
  padding: 18px 20px;
}

.head-valid { background: linear-gradient(135deg, #0f6b2f, #16a34a); }
.head-invalid { background: linear-gradient(135deg, #991b1b, #dc2626); }
.head-neutral { background: linear-gradient(135deg, #0f172a, #334155); }

.head-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  flex-shrink: 0;
}

.detail-tile {
  background: rgba(15, 23, 42, 0.03);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 12px;
  padding: 8px 10px;
  height: 100%;
}

.hash-box {
  background: #0f172a;
  border-radius: 12px;
  padding: 10px 12px;
}

.hash-value {
  font-family: monospace;
  font-size: 11px;
  color: #a7f3d0;
  word-break: break-all;
  line-height: 1.5;
}
</style>
