<template>
  <!--
    AI BOT MAISMOLA — botão flutuante + QDialog (Fase 2 do MAISMOLA_BOT_AUDIT.md)
    Somente consultas (leitura). Ações financeiras são recusadas pelo backend.
  -->
  <div>
    <q-btn
      fab
      color="primary"
      icon="smart_toy"
      aria-label="Assistente IA"
      style="position: fixed; right: 24px; bottom: 24px; z-index: 3000"
      @click="open = true"
    >
      <q-tooltip>Assistente IA MaisMola</q-tooltip>
    </q-btn>

    <q-dialog v-model="open" position="right" :maximized="$q.screen.lt.md" style="z-index: 3100">
      <q-card style="width: 460px; max-width: 95vw; height: 88vh; display: flex; flex-direction: column">
        <q-card-section class="bg-primary text-white row items-center q-py-sm">
          <q-icon name="smart_toy" size="24px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Assistente MaisMola</div>
          <q-space />
          <q-btn flat round dense icon="delete_sweep" @click="limpar">
            <q-tooltip>Limpar conversa</q-tooltip>
          </q-btn>
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>

        <q-banner class="bg-grey-2 text-grey-8 q-py-xs" dense>
          <template #avatar>
            <q-icon name="lock" size="18px" color="grey-7" />
          </template>
          <span class="text-caption">Só consultas. Desembolsos, pagamentos e fecho de caixa continuam no menu Caixa/Pagamentos.</span>
        </q-banner>

        <!-- Histórico -->
        <q-card-section class="col scroll q-gutter-y-md" ref="chatSection">
          <div v-if="!messages.length" class="text-center text-grey-6 q-pa-lg">
            <q-icon name="forum" size="42px" />
            <div class="text-subtitle2 q-mt-sm">Pergunte em português…</div>
          </div>

          <template v-for="(msg, i) in messages" :key="i">
            <q-chat-message
              v-if="msg.from === 'user'"
              :text="[msg.text]"
              sent
              bg-color="primary"
              text-color="white"
            />
            <div v-else>
              <q-chat-message :text="[msg.text]" bg-color="grey-3" />
              <q-table
                v-if="msg.table && msg.table.rows.length"
                class="q-mt-sm bot-table"
                dense
                flat
                bordered
                :rows="msg.table.rows"
                :columns="msg.table.columns"
                row-key="index"
                :pagination="{ rowsPerPage: 8 }"
                virtual-scroll
                style="max-height: 300px"
              />
            </div>
          </template>

          <div v-if="loading" class="row items-center q-px-md q-py-xs">
            <q-spinner-dots color="primary" size="28px" />
            <span class="text-caption text-grey-6 q-ml-sm">A consultar…</span>
          </div>
        </q-card-section>

        <!-- Chips de atalho -->
        <q-card-section class="q-py-xs">
          <div class="row q-gutter-xs">
            <q-chip
              v-for="chip in chips"
              :key="chip"
              clickable
              dense
              outline
              color="primary"
              :disable="loading"
              @click="enviar(chip)"
            >
              {{ chip }}
            </q-chip>
          </div>
        </q-card-section>

        <!-- Input -->
        <q-card-section class="q-pt-none">
          <q-input
            v-model="pergunta"
            outlined
            dense
            :disable="loading"
            placeholder="Pergunte... ex: Cliente 108 deve quanto? ou Estado da caixa hoje?"
            @keyup.enter="enviar()"
          >
            <template #append>
              <q-btn round dense flat icon="send" color="primary" :disable="loading || !pergunta.trim()" @click="enviar()" />
            </template>
          </q-input>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import api from '../boot/axios'

export default {
  name: 'AiBotMaisMola',
  data () {
    return {
      open: false,
      pergunta: '',
      loading: false,
      messages: [],
      chips: [
        'Estado da caixa de hoje',
        'Clientes em atraso hoje',
        'Vencimentos de hoje',
        'Saldo das carteiras'
      ]
    // 'Clientes em atraso hoje' agora usa a tool clientes_em_atraso no backend
    }
  },
  methods: {
    limpar () {
      this.messages = []
    },
    // Converte o payload da tool em linhas de QTable (colunas dinâmicas).
    buildTable (data) {
      try {
        if (!data || typeof data !== 'object') return null
        let rows = null
        if (Array.isArray(data)) rows = data
        else if (Array.isArray(data.vencimentos)) rows = data.vencimentos
        else if (Array.isArray(data.ranking)) rows = data.ranking
        else if (Array.isArray(data.prestacoes)) rows = data.prestacoes
        else if (Array.isArray(data.detalhe)) rows = data.detalhe
        else if (Array.isArray(data.carteiras)) rows = data.carteiras
        else if (Array.isArray(data.movimentos)) rows = data.movimentos
        else if (Array.isArray(data.detalhe_atraso)) rows = data.detalhe_atraso
        else if (Array.isArray(data.creditos)) rows = data.creditos
        if (!rows || !rows.length) return null
        const sample = rows[0]
        const columns = Object.keys(sample).map((k) => ({
          name: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          field: k,
          align: 'left',
          sortable: true,
          format: (v) => (v === null || v === undefined ? '—' : String(v))
        }))
        return { columns, rows: rows.map((r, i) => ({ ...r, index: i })) }
      } catch {
        return null
      }
    },
    async enviar (textoPre = null) {
      const pergunta = (textoPre || this.pergunta).trim()
      if (!pergunta || this.loading) return
      this.pergunta = ''
      this.messages.push({ from: 'user', text: pergunta })
      this.loading = true
      this.scrollToBottom()
      try {
        const { data } = await api.post('/api/ai-bot/query', { query: pergunta }, { timeout: 45000 })
        const resposta = data?.resposta_em_texto_curto || 'Não obtive resposta.'
        this.messages.push({ from: 'bot', text: resposta, table: this.buildTable(data?.data) })
      } catch (e) {
        const msg = e?.response?.data?.message || 'Erro ao consultar o assistente. Tente novamente.'
        this.messages.push({ from: 'bot', text: msg })
      } finally {
        this.loading = false
        this.scrollToBottom()
      }
    },
    scrollToBottom () {
      this.$nextTick(() => {
        const el = this.$refs.chatSection?.$el
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  }
}
</script>

<style scoped>
.bot-table {
  font-size: 11px;
}
</style>
