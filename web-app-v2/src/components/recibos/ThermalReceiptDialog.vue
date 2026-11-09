<template>
  <q-dialog v-model="isOpen" transition-show="scale" transition-hide="fade">
    <q-card class="thermal-dialog-card">
      <!-- Barra superior de acções -->
      <q-card-section class="bg-grey-9 text-white row items-center q-py-xs q-px-md no-print">
        <q-icon name="print" size="20px" class="q-mr-xs" />
        <span class="text-subtitle2 text-weight-bold">Talão Térmico (80mm)</span>
        <q-space />
        <q-btn flat dense no-caps color="positive" icon="print" label="Imprimir Talão" class="q-mr-xs" @click="printTicket" />
        <q-btn flat dense no-caps color="green-4" icon="chat" label="WhatsApp" class="q-mr-xs" @click="shareWhatsApp" />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <!-- Conteúdo do Talão Térmico de 80mm -->
      <q-card-section class="thermal-paper q-pa-md scroll" id="thermal-receipt-area">
        <div class="ticket-container">
          <!-- Cabeçalho Institucional -->
          <div class="ticket-header text-center">
            <div class="company-name">{{ company?.companyName || 'MBR MICROCRÉDITO' }}</div>
            <div class="company-sub" v-if="company?.companyNuit">NUIT: {{ company.companyNuit }}</div>
            <div class="company-sub" v-if="company?.companyAddress || company?.bairro">
              {{ [company?.companyAddress, company?.bairro, company?.cidade].filter(Boolean).join(', ') }}
            </div>
            <div class="company-sub" v-if="company?.companyPhone">Tel: {{ company.companyPhone }}</div>
          </div>

          <div class="ticket-divider">================================</div>

          <!-- Identificação do Recibo Fiscal -->
          <div class="ticket-row-bold text-center">
            RECIBO OFICIAL Nº {{ reciboData.numero || 'REC-PROVISÓRIO' }}
          </div>
          <div class="ticket-row text-center text-caption" style="font-size: 11px">
            {{ formatDateTime(reciboData.data_emissao || reciboData.createdAt || new Date()) }}
          </div>
          <div class="ticket-row text-center text-caption" style="font-size: 10px" v-if="reciboData.operador || reciboData.staffName">
            Operador: {{ reciboData.operador || reciboData.staffName }}
          </div>

          <div class="ticket-divider">--------------------------------</div>

          <!-- Dados do Cliente -->
          <div class="ticket-section-title">DADOS DO MUTUÁRIO</div>
          <div class="ticket-row"><strong>Nome:</strong> {{ reciboData.customer_name || reciboData.customerName || 'Mutuário' }}</div>
          <div class="ticket-row"><strong>Conta:</strong> #{{ reciboData.account_number || reciboData.accountNumber || '—' }}</div>
          <div class="ticket-row" v-if="reciboData.customer_phone || reciboData.customerPhone">
            <strong>Contacto:</strong> {{ reciboData.customer_phone || reciboData.customerPhone }}
          </div>

          <div class="ticket-divider">--------------------------------</div>

          <!-- Detalhes do Pagamento -->
          <div class="ticket-section-title">DESCRIÇÃO DO PAGAMENTO</div>
          <div class="ticket-row" v-if="reciboData.installment_order || reciboData.installmentOrder">
            <strong>Prestação:</strong> {{ installmentLabel(reciboData.installment_order || reciboData.installmentOrder) }}
          </div>
          <div class="ticket-row" v-if="reciboData.due_date || reciboData.installmentDueDate">
            <strong>Vencimento:</strong> {{ formatDate(reciboData.due_date || reciboData.installmentDueDate) }}
          </div>

          <div class="ticket-breakdown q-mt-xs">
            <div class="row justify-between ticket-row" v-if="Number(reciboData.capital_pago || reciboData.amount) > 0">
              <span>Amortização Capital:</span>
              <span>{{ formatMoney(reciboData.capital_pago || reciboData.amount) }}</span>
            </div>
            <div class="row justify-between ticket-row" v-if="Number(reciboData.juros_pagos) > 0">
              <span>Juros Contratuais:</span>
              <span>{{ formatMoney(reciboData.juros_pagos) }}</span>
            </div>
            <div class="row justify-between ticket-row text-negative" v-if="Number(reciboData.mora_paga || reciboData.latePaymentInterest) > 0">
              <span>Juros de Mora:</span>
              <span>+{{ formatMoney(reciboData.mora_paga || reciboData.latePaymentInterest) }}</span>
            </div>
            <div class="row justify-between ticket-row text-positive" v-if="Number(reciboData.desconto || reciboData.discountAmount) > 0">
              <span>Desconto Aplicado:</span>
              <span>-{{ formatMoney(reciboData.desconto || reciboData.discountAmount) }}</span>
            </div>
          </div>

          <div class="ticket-divider">================================</div>

          <!-- Total e Método -->
          <div class="row justify-between items-baseline ticket-total-row">
            <span class="total-title">TOTAL PAGO:</span>
            <span class="total-val">{{ formatMoney(reciboData.valor_pago || reciboData.totalAmount || reciboData.amount) }}</span>
          </div>

          <div class="ticket-row q-mt-xs">
            <strong>Método:</strong> {{ methodLabel(reciboData.payment_method || reciboData.paymentMethod) }}
          </div>
          <div class="ticket-row" v-if="reciboData.referencia || reciboData.tranzactionReference">
            <strong>Referência:</strong> {{ reciboData.referencia || reciboData.tranzactionReference }}
          </div>
          <div class="ticket-row" v-if="reciboData.saldo_devedor_restante !== undefined && reciboData.saldo_devedor_restante !== null">
            <strong>Saldo Devedor:</strong> {{ formatMoney(reciboData.saldo_devedor_restante) }}
          </div>

          <div class="ticket-divider">--------------------------------</div>

          <!-- Selo Eletrónico AT -->
          <div class="ticket-at-box text-center">
            <div class="ticket-caption-sm text-weight-bold">AUTORIDADE TRIBUTÁRIA DE MOÇAMBIQUE</div>
            <div class="at-hash" v-if="reciboData.hash_at || reciboData.reciboHash">
              Selo AT: {{ (reciboData.hash_at || reciboData.reciboHash).substring(0, 32) }}...
            </div>
            <div class="at-code" v-if="reciboData.at_validation_code">
              Validação: {{ reciboData.at_validation_code }}
            </div>
            <div class="at-cert">Software Certificado nº 2026/001</div>
          </div>

          <div class="ticket-divider">--------------------------------</div>

          <!-- Rodapé -->
          <div class="ticket-footer text-center">
            <div>Obrigado pela preferência!</div>
            <div>Conserve este talão como comprovativo oficial.</div>
            <div class="powered">Processado por Mais Mola v2026</div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recibo: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const companyStore = useCompanyStore()
const company = computed(() => companyStore.company || {})

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const reciboData = computed(() => props.recibo || {})

function installmentLabel(order) {
  if (!order) return '—'
  const clean = String(order).replace(/[ºª]/g, '').trim()
  return clean ? `${clean}ª prestação` : '—'
}

function formatDate(val) {
  return formatDateShort(val) || '—'
}

function formatDateTime(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function methodLabel(method) {
  const m = String(method || '').toUpperCase()
  if (m === '7' || m.includes('MPESA') || m.includes('M-PESA')) return 'M-Pesa (Vodacom)'
  if (m === '1' || m === 'CASH' || m.includes('NUMERÁRIO')) return 'Numerário (Caixa Balcão)'
  if (m === '3' || m.includes('TRANSFER')) return 'Transferência Bancária'
  if (m === '4' || m.includes('DEPÓSITO')) return 'Depósito Bancário'
  if (m === '5' || m.includes('TPA') || m.includes('POS')) return 'POS / TPA'
  if (m === '6' || m.includes('EMOLA')) return 'E-Mola'
  return m || 'Numerário'
}

function printTicket() {
  const printArea = document.getElementById('thermal-receipt-area')
  if (!printArea) return

  const printWindow = window.open('', '_blank', 'width=380,height=600')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Talão Térmico - ${reciboData.value.numero || 'Recibo'}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 8px 10px;
            width: 78mm;
          }
          .ticket-container { width: 100%; }
          .ticket-header { text-align: center; margin-bottom: 6px; }
          .company-name { font-size: 13px; font-weight: bold; text-transform: uppercase; }
          .company-sub { font-size: 10px; }
          .ticket-divider { text-align: center; font-size: 11px; margin: 4px 0; overflow: hidden; letter-spacing: -1px; }
          .ticket-row-bold { font-size: 12px; font-weight: bold; }
          .ticket-section-title { font-size: 10px; font-weight: bold; text-decoration: underline; margin-bottom: 2px; }
          .ticket-row { font-size: 11px; margin: 2px 0; display: flex; justify-content: space-between; }
          .ticket-total-row { font-size: 14px; font-weight: bold; margin: 6px 0; display: flex; justify-content: space-between; }
          .ticket-at-box { font-size: 9px; margin-top: 4px; }
          .at-hash { word-break: break-all; font-size: 8px; }
          .ticket-footer { font-size: 10px; margin-top: 6px; text-align: center; }
          .powered { font-size: 8px; color: #555; margin-top: 4px; }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

function shareWhatsApp() {
  const phone = (reciboData.value.customer_phone || reciboData.value.customerPhone || '').replace(/\D/g, '')
  const total = formatMoney(reciboData.value.valor_pago || reciboData.value.totalAmount || reciboData.value.amount)
  const num = reciboData.value.numero || 'Oficial'
  const text = encodeURIComponent(
    `*${company.value?.companyName || 'Mais Mola'}*\n` +
    `Olá ${reciboData.value.customer_name || 'Estimado(a) Cliente'},\n` +
    `Confirmamos a recepção do seu pagamento no valor de *${total}*.\n` +
    `*Recibo:* ${num}\n` +
    `*Data:* ${formatDateTime(reciboData.value.data_emissao || new Date())}\n` +
    `Obrigado pela preferência!`
  )
  const target = phone.length >= 9 ? `https://wa.me/258${phone.slice(-9)}?text=${text}` : `https://wa.me/?text=${text}`
  window.open(target, '_blank')
}
</script>

<style scoped>
.thermal-dialog-card {
  width: 360px;
  max-width: 95vw;
  border-radius: 12px;
  background: #f8fafc;
}

.thermal-paper {
  background: #ffffff;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.3;
  color: #111827;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  margin: 12px;
  max-height: 80vh;
}

.ticket-container {
  width: 100%;
}

.company-name {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  color: #000;
}

.company-sub {
  font-size: 11px;
  color: #374151;
}

.ticket-divider {
  font-size: 12px;
  text-align: center;
  color: #6b7280;
  margin: 4px 0;
  letter-spacing: -1px;
  user-select: none;
}

.ticket-row-bold {
  font-size: 13px;
  font-weight: 800;
  color: #000;
}

.ticket-section-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #1f2937;
  margin-bottom: 3px;
}

.ticket-row {
  font-size: 11.5px;
  margin: 2px 0;
}

.ticket-total-row {
  margin: 6px 0;
  padding: 4px 0;
}

.total-title {
  font-size: 14px;
  font-weight: 900;
  color: #000;
}

.total-val {
  font-size: 15px;
  font-weight: 900;
  color: #15803d;
}

.ticket-at-box {
  background: #f1f5f9;
  border: 1px dotted #94a3b8;
  padding: 6px;
  border-radius: 4px;
  font-size: 9.5px;
}

.at-hash {
  font-family: monospace;
  font-size: 8.5px;
  color: #475569;
  word-break: break-all;
}

.at-code {
  font-weight: 700;
  color: #0f172a;
}

.at-cert {
  font-size: 8.5px;
  color: #64748b;
}

.ticket-footer {
  font-size: 10.5px;
  color: #4b5563;
  margin-top: 6px;
}

.powered {
  font-size: 8.5px;
  color: #9ca3af;
  margin-top: 4px;
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>
