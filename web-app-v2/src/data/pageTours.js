/**
 * TOURS POR PÁGINA — "explicar esta página"
 * ──────────────────────────────────────────
 * Cada página do menu lateral tem aqui o seu percurso curto (3 a 5 passos) que
 * responde sempre às mesmas três perguntas do utilizador novo:
 *
 *   1. Onde clico para fazer a acção principal desta página?
 *   2. O que significa cada número/indicador que estou a ver?
 *   3. Que erro é que as pessoas cometem aqui e como o evitar?
 *
 * Os passos apontam para elementos reais através de atributos `data-tour`
 * (ver as páginas e a sidebar). Quando um alvo não existe naquele perfil ou
 * naquele estado da página, o motor do tour salta o passo em vez de bloquear.
 *
 * Este ficheiro é só DADOS: além do recipiente reactivo dos números citados
 * pelo tour (./tourFacts), não importa nada — o `useAppTour` lê-o sem criar
 * ciclos de importação.
 *
 * Os passos cujo texto cita números reais do servidor declaram `text` como
 * função (avaliada quando o passo aparece) e `ready` (o motor espera até os
 * números existirem). Ver o tour da Administração do Sistema.
 *
 * Terminologia obrigatória (Moçambique — nunca usar termos do Brasil):
 *   Mutuário · Entrega de Valores ao Cofre Central · Reforço de Caixa ·
 *   Mapa Diário Modelo BM · Conferência Cega · Auto de Diferença ·
 *   Prestação · Aporte · PAR 30.
 */

import { formatCount, resetRowsOf, tourFacts } from './tourFacts'

/** Áreas do menu lateral — a mesma ordem do menu. */
export const PAGE_TOURS = [
  {
    id: 'geral',
    label: 'Geral',
    pages: [
      {
        id: 'painel',
        path: '/dashboard',
        label: 'Painel',
        roles: [0, 1, 2],
        steps: [
          {
            el: '[data-tour="dash-filters"]',
            title: 'Filtros de Período & Sincronização',
            text: 'Define o período de análise (<strong>Hoje</strong>, <strong>Semana</strong>, <strong>Mês</strong>, <strong>Ano</strong> ou datas personalizadas) e clica em <strong>Actualizar</strong>. O filtro sincroniza os desembolsos e cobranças do período sem afectar a posição viva da carteira activa.',
            side: 'bottom'
          },
          {
            el: '[data-tour="dash-kpis"]',
            title: '5 Indicadores Mestres (Padrão CGAP / Bancário)',
            text: '<strong>Carteira Activa Bruta (GLP)</strong>: capital total em dívida. <strong>PAR 30</strong>: termómetro regulamentar de risco (<5% Saudável, 5-10% Alerta, >10% Crítico). <strong>Desembolsos</strong>, <strong>Reembolsos & Cobrança</strong> (com quebra de capital, juros, mora e eficácia) e <strong>Liquidez Real</strong> em conta.',
            side: 'bottom'
          },
          {
            el: '[data-tour="dash-pipeline"]',
            title: 'Funil Operacional & Pipeline de Crédito',
            text: 'Acompanha em tempo real as 4 etapas operacionais: <strong>Pedidos em Análise</strong>, <strong>Aprovados a aguardar desembolso</strong>, <strong>A Vencer esta Semana</strong> e <strong>Prestações em Incumprimento</strong>. Clica em qualquer cartão para navegar directamente.',
            side: 'bottom'
          },
          {
            el: '[data-tour="dash-matrix"]',
            title: 'Evolução da Carteira & Matriz de Risco (Aging)',
            text: 'Gráfico histórico dos últimos 6 meses (desembolsos vs reembolsos) e <strong>Matriz de Aging</strong> por escalões de mora: Em Dia (0 dias), 1 a 30 dias, 31 a 60 dias (PAR30), 61 a 90 dias (PAR60) e acima de 90 dias.',
            side: 'top'
          },
          {
            el: '[data-tour="dash-managers"]',
            title: 'Produtividade & Desempenho por Gestor',
            text: 'Auditoria e metas da equipa: volume de carteira sob custódia de cada gestor, reembolsos recebidos no período seleccionado e taxa de incumprimento individual.',
            side: 'top'
          },
          {
            el: '[data-tour="dash-alerts"]',
            title: 'Alertas de Incumprimento & Próximas Prestações',
            text: 'Mutuários em situação crítica com mora acumulada e dias de atraso para contacto urgente, ao lado da agenda de prestações a vencer nos próximos dias.',
            side: 'top'
          },
          {
            el: '[data-tour="dash-wallets"]',
            title: 'Origem de Capital & Carteiras de Financiadores',
            text: 'Posição consolidada dos fundos próprios e parceiros investidores (capital alocado, desembolsado e disponível). Confirma sempre a liquidez real antes de conceder novos créditos.',
            side: 'top'
          }
        ]
      },
      {
        id: 'painel-gestor',
        path: '/gestor',
        label: 'Painel do Gestor',
        roles: [3],
        steps: [
          {
            el: '[data-tour="gestor-filters"]',
            title: 'A tua agenda de cobrança',
            text: 'Filtra por <strong>estado</strong> (pendente, paga, em atraso), mutuário e datas. O botão PDF exporta exactamente a grade que estás a ver.',
            side: 'bottom'
          },
          {
            el: '[data-tour="gestor-kpis"]',
            title: 'Resumo do dia em números',
            text: '<strong>Total de prestações</strong>, <strong>pagas</strong>, <strong>pendentes</strong> e <strong>em atraso</strong> do período. Se o número de atrasadas subir, começa o dia pela Cobrança.',
            side: 'bottom'
          },
          {
            el: '[data-tour="gestor-table"]',
            title: 'A grelha das prestações',
            text: 'Cada linha é uma prestação com data de vencimento e valor. <strong>Verde</strong> = paga, <strong>laranja</strong> = a vencer, <strong>vermelho</strong> = vencida. Clica no mutuário para abrir a ficha completa.',
            side: 'bottom'
          },
          {
            el: '[data-tour="nav:/cobranca"]',
            title: 'Não cobres sem registar',
            text: 'Erro comum: receber dinheiro na rua sem registar a visita/promessa — depois não há prova nem histórico. Regista sempre na Cobrança antes de sair para o campo.',
            side: 'right'
          }
        ]
      },
      {
        id: 'empresas',
        path: '/company',
        label: 'Painel da Empresa',
        roles: [0],
        steps: [
          {
            el: '[data-tour="company-body"]',
            title: 'Todas as empresas subscritoras',
            text: 'Como <strong>Super Admin</strong> geres aqui as empresas que usam a plataforma: estado da subscrição, plano contratado e utilizadores de cada uma.',
            side: 'bottom'
          },
          {
            el: '[data-tour="page-content"]',
            title: 'Cuidado com o estado da subscrição',
            text: 'Suspender uma empresa bloqueia o login de todos os utilizadores dela. Confirma o pagamento antes de alterar o estado — e usa o histórico do sistema para ver quem fez a alteração.',
            side: 'bottom'
          },
          {
            el: '[data-tour="nav:/configuracoes"]',
            title: 'Planos e super admins',
            text: 'Os planos e os Super Admins ficam em <strong>Configurações</strong>. Erro comum: criar empresa sem plano definido — fica sem limites de utilizadores nem histórico de facturação.',
            side: 'right'
          }
        ]
      },
      {
        id: 'config-globais',
        path: '/configuracoes',
        label: 'Configurações Globais',
        roles: [0],
        steps: [
          {
            el: '[data-tour="superadmin-body"]',
            title: 'Parâmetros da plataforma',
            text: 'Aqui vivem os Super Admins, os planos de subscrição e os parâmetros que valem para todas as empresas. Uma alteração aqui afecta todas as empresas subscritoras.',
            side: 'bottom'
          },
          {
            el: '[data-tour="page-content"]',
            title: 'Erro comum: testar em produção',
            text: 'Não cries planos de teste com empresas reais associadas. Cria primeiro um plano, valida com uma empresa de teste e só depois migra as empresas.',
            side: 'bottom'
          },
          {
            el: '[data-tour="nav:/company"]',
            title: 'Confirma o efeito no Painel da Empresa',
            text: 'Depois de alterar planos ou parâmetros, volta ao <strong>Painel da Empresa</strong> para confirmar que cada subscrição continua no estado certo.',
            side: 'right'
          }
        ]
      }
    ]
  },
  {
    id: 'credito',
    label: 'Crédito',
    pages: [
      {
        id: 'mutuarios',
        path: '/mutuarios',
        label: 'Mutuários',
        roles: [1, 2, 3],
        steps: [
          {
            el: '[data-tour="customers-kpis"]',
            title: 'A tua carteira de mutuários',
            text: '<strong>Total</strong>, <strong>empresas</strong>, <strong>activos</strong> e <strong>inactivos</strong>. Um mutuário inactivo mantém o histórico mas não deve receber crédito novo sem reavaliação.',
            side: 'bottom'
          },
          {
            el: '[data-tour="customers-filters"]',
            title: 'Clica em «Novo mutuário» para registar o mutuário',
            text: 'Regista primeiro o <strong>NUIT e o BI</strong> (ou DIRE) e o telefone. Usa a barra de pesquisa para encontrar por nome, telefone ou número de conta antes de criar uma ficha duplicada.',
            side: 'bottom'
          },
          {
            el: '[data-tour="customers-table"]',
            title: 'Lê os sinais da lista',
            text: 'O <strong>ícone de alerta</strong> marca quem tem prestação atrasada; a conta abre a ficha 360º (créditos, prestações, documentos KYC, garantias e cobrança). Ordena por atraso para priorizar o dia.',
            side: 'bottom'
          },
          {
            el: '[data-tour="nav:/loans"]',
            title: 'Só depois vais a Créditos',
            text: 'Erro comum: abrir crédito antes de anexar BI/NUIT e garantias — o pedido fica pendente na aprovação. Completa a ficha e segue para <strong>Créditos</strong> para simular e submeter.',
            side: 'right'
          }
        ]
      },
      {
        id: 'mutuario-ficha',
        pattern: /^\/mutuarios\/[^/]+$/,
        path: null,
        label: 'Ficha do Mutuário',
        roles: [1, 2, 3],
        steps: [
          {
            el: '[data-tour="mutuario-header"]',
            title: 'Cockpit 360° do Mutuário',
            text: 'Cabeçalho executivo com dados cadastrais do cliente, contacto, estado da conta e a <strong>Taxa de Esforço (DTI)</strong> calculada pelo padrão prudencial do Banco de Moçambique.',
            side: 'bottom'
          },
          {
            el: '[data-tour="mutuario-kpis"]',
            title: 'Indicadores de Risco & Dívida',
            text: 'Acompanha em tempo real o <strong>Rendimento mensal</strong>, <strong>Total em Dívida</strong> viva, margem de capacidade e conformidade do <strong>Dossier KYC</strong>.',
            side: 'bottom'
          },
          {
            el: '[data-tour="mutuario-actions"]',
            title: 'Acções Rápidas de Balcão',
            text: 'Atalhos imediatos para <strong>Registar Pagamento</strong> (recebimento na hora), iniciar <strong>Cobrança SMS/WhatsApp</strong> com modelos profissionais e emitir o <strong>Extracto em PDF</strong>.',
            side: 'left'
          },
          {
            el: '[data-tour="mutuario-tabs"]',
            title: 'Navegação por Abas Especializadas',
            text: 'Alterna entre a <strong>Visão Geral</strong> (timeline e saúde financeira), <strong>Créditos & Concessão</strong>, <strong>Plano de Amortização</strong>, <strong>Documentos & KYC</strong>, <strong>Documentos Legais</strong> e <strong>Garantias & Recibos</strong>.',
            side: 'bottom'
          }
        ]
      },
      {
        id: 'creditos',
        path: '/loans',
        label: 'Créditos',
        roles: [1, 2, 3],
        steps: [
          {
            el: '[data-tour="loans-header"]',
            title: 'Conceder Crédito começa aqui',
            text: '<strong>Conceder Crédito</strong> abre a simulação (capital, prazo, taxa e garantias). PDF e Excel exportam a lista que estás a ver.',
            side: 'bottom'
          },
          {
            el: '[data-tour="loans-tabs"]',
            title: 'Lista de todos os créditos por estado',
            text: '<strong>Rascunho</strong> (ainda a preparar), <strong>Aguardando Aprovação</strong>, <strong>Aprovado</strong>, <strong>Desembolsado</strong>, <strong>Terminado</strong> e <strong>Rejeitado</strong>. Cada aba é uma fase do processo.',
            side: 'bottom'
          },
          {
            el: '[data-tour="loans-table"]',
            title: 'Clica no crédito para abrir o detalhe',
            text: 'Dentro vês o <strong>plano de amortização</strong>, as garantias e os pagamentos. Se fores Gestor, só aprovas até <strong>25.000 MT</strong>; acima disso a aprovação é do Admin.',
            side: 'bottom'
          },
          {
            el: '[data-tour="loans-filtros"]',
            title: 'Erro comum: aprovar sem garantia',
            text: 'Um crédito sem garantia registada (ou com cobertura insuficiente) não deve ser aprovado. Usa o filtro por gestor para revisares o que está na tua mão.',
            side: 'bottom'
          }
        ]
      },
      {
        id: 'cobranca',
        path: '/cobranca',
        label: 'Cobrança',
        roles: [1, 2, 3],
        steps: [
          {
            el: '[data-tour="cobranca-filters"]',
            title: 'Aqui estão só os mutuários em atraso',
            text: 'Filtra por <strong>dias de atraso</strong> (1-7, 8-30, 31-60, +60) e pesquisa por nome ou conta. Os dois indicadores dizem quantos mutuários e quanto dinheiro está em risco.',
            side: 'bottom'
          },
          {
            el: '[data-tour="cobranca-table"]',
            title: 'Lê a linha antes de ligar',
            text: '<strong>Prestações vencidas</strong>, <strong>atraso máximo</strong> e <strong>valor em atraso</strong>. A coluna «Última cobrança» evita repetir a mesma chamada ao mesmo mutuário no mesmo dia.',
            side: 'bottom'
          },
          {
            el: '[data-tour="cobranca-actions"]',
            title: 'Registar Visita e Registar PTP',
            text: 'A <strong>casa</strong> regista a visita domiciliária (com GPS, se autorizares); o <strong>aperto de mão</strong> regista a promessa de pagamento (PTP) com data e valor. Erro comum: prometer por telefone e não registar — a promessa não conta.',
            side: 'left'
          },
          {
            el: '[data-tour="nav:/carteira"]',
            title: 'Vê o efeito na tua carteira',
            text: 'A Carteira do Gestor mostra o <strong>PAR 30</strong>, o valor a receber hoje e as promessas do dia. Se o PAR 30 subir, aumenta as visitas antes do fim do mês.',
            side: 'right'
          }
        ]
      },
      {
        id: 'carteira',
        path: '/carteira',
        label: 'Carteira do Gestor',
        roles: [1, 3],
        steps: [
          {
            el: '[data-tour="carteira-kpis"]',
            title: 'Total da carteira, a receber hoje e PAR 30',
            text: '<strong>Total da carteira</strong> = dívida dos teus mutuários. <strong>A receber hoje</strong> = prestações que vencem hoje. <strong>PAR 30</strong> = valor em atraso há mais de 30 dias (o risco). <strong>Promessas do dia</strong> = PTP marcadas para hoje.',
            side: 'bottom'
          },
          {
            el: '[data-tour="carteira-composicao"]',
            title: 'Composição da carteira',
            text: 'Mutuários atribuídos, mutuários em atraso e mutuários disponíveis para atribuição. Clica em cada número para filtrar a lista abaixo.',
            side: 'bottom'
          },
          {
            el: '[data-tour="carteira-ranking"]',
            title: 'Compara a tua performance (Admin)',
            text: 'O ranking por gestor compara carteira, PAR 30 e visitas do mês. Serve para apoiar quem está abaixo da média — não para pressionar com números isolados.',
            side: 'bottom'
          },
          {
            el: '[data-tour="nav:/cobranca"]',
            title: 'Do risco à acção',
            text: 'Erro comum: olhar para o PAR 30 e não agir. Clica em Cobrança para ver exactamente quem está em atraso e registar a próxima diligência.',
            side: 'right'
          }
        ]
      },
      {
        id: 'prestacoes',
        path: '/admin/installments',
        label: 'Controle Prestações',
        roles: [1, 2, 3],
        steps: [
          {
            el: '[data-tour="installments-kpis"]',
            title: '4 Indicadores Executivos de Cobrança',
            text: 'Resumo da carteira viva: <strong>Em Atraso</strong> (volume e mora em risco), <strong>A Vencer nos Próximos 30 Dias</strong>, <strong>Juros de Mora Gerados</strong> e <strong>Liquidadas / Pagas</strong>.',
            side: 'bottom'
          },
          {
            el: '[data-tour="installments-body"]',
            title: 'Filtros Rápidos & Segmentação',
            text: 'Filtra com um clique por presets executivos: <strong>Vencidas & 30 Dias</strong> (padrão de cobrança), <strong>Em Atraso</strong>, <strong>Vencem Hoje</strong>, <strong>Liquidadas</strong> ou <strong>Todas</strong>, além de busca por mutuário e intervalo de datas.',
            side: 'bottom'
          },
          {
            el: '[data-tour="installments-table"]',
            title: 'Grelha de Prestações & Cálculo de Mora',
            text: 'Acompanha cada prestação com o valor original, amortizações parciais, <strong>juros de mora diários</strong> acumulados e total real a liquidar. Clica no mutuário para aceder à ficha 360°.',
            side: 'top'
          },
          {
            el: '[data-tour="installments-actions"]',
            title: 'Avisos de Cobrança (SMS & WhatsApp Directo)',
            text: 'Dispara notificações instantâneas com 8 modelos profissionais padronizados (preventivo, dia D, avisos formais, pré-contencioso e recibos). Permite envio via <strong>SMS Gateway</strong> ou abertura imediata no <strong>WhatsApp Directo</strong>.',
            side: 'left'
          }
        ]
      }
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    pages: [
      {
        id: 'pagamentos',
        path: '/pagamentos',
        label: 'Recebimentos & Caixa',
        roles: [1],
        steps: [
          {
            el: '[data-tour="payments-quick-btn"]',
            title: 'Receber Pagamento Sem Voltas (Quick Pay)',
            text: 'Clica aqui para receber qualquer prestação na hora. Pesquisa o mutuário por nome, conta ou telefone, escolhe a prestação devida e cobra via <strong>M-Pesa API</strong> (envia pedido de PIN directo ao telemóvel do cliente), <strong>Numerário</strong> (entrada em caixa) ou <strong>Banco/POS</strong>.',
            side: 'bottom'
          },
          {
            el: '[data-tour="payments-kpis"]',
            title: 'Cockpit Financeiro de Recebimentos',
            text: 'Resumo executivo do dia e do período: <strong>Total Recebido</strong>, <strong>Entradas de Hoje</strong>, <strong>Juros de Mora Recuperados</strong> e a percentagem arrecadada via M-Pesa vs Numerário.',
            side: 'bottom'
          },
          {
            el: '[data-tour="payments-filters"]',
            title: 'Filtros Rápidos & Exportações',
            text: 'Selecciona o intervalo de tempo com atalhos rápidos (<strong>Hoje</strong>, <strong>Ontem</strong>, <strong>Esta Semana</strong>, <strong>Este Mês</strong>, <strong>Ano</strong>), pesquisa inteligente e exporta relatórios formatados em <strong>PDF</strong> e <strong>Excel</strong>.',
            side: 'bottom'
          },
          {
            el: '[data-tour="payments-table"]',
            title: 'Histórico, Talão Térmico (80mm) & WhatsApp',
            text: 'Cada linha regista a liquidação detalhada. Clica em <strong>Recibo</strong> para abrir o <strong>PDF oficial (A4)</strong>, imprimir no formato <strong>Talão Térmico de Balcão (80mm)</strong> ou reenviar o comprovativo directamente para o <strong>WhatsApp</strong> do cliente.',
            side: 'top'
          }
        ]
      },
      {
        id: 'caixa',
        path: '/caixa',
        label: 'Caixa',
        roles: [1],
        steps: [
          {
            el: '[data-tour="caixa-body"]',
            title: 'O caixa do dia',
            text: 'É o diário de auditoria do dinheiro que passa pela gaveta: entradas, saídas, entregas e despesas. O caixa abre com saldo zero e um <strong>fundo de maneio</strong> contado por denominação.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-abrir"], [data-tour="cash-electronic-open"]',
            title: 'Abrir o dia: contagem cega ou saldo do banco',
            text: 'No caixa <strong>físico</strong> abres com a <strong>Folha de Contagem</strong> (nota a nota e moeda a moeda). No caixa <strong>electrónico</strong> indicas o saldo que vês no banco hoje de manhã. Erro comum: escrever o total «de cabeça» — no físico a folha é a prova; no electrónico o saldo tem de bater com o extracto.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-movimentos"], [data-tour="cash-electronic-movimentos"], [data-tour="nav:/pagamentos"]',
            title: 'Registar entradas e saídas',
            text: '<strong>Nova Entrada</strong> para pagamentos de mutuários e <strong>Nova Saída</strong> para despesas. Sem caixa aberto os pagamentos são recusados — é por isso que o Caixa vem antes de Pagamentos no dia. Cada movimento pede a categoria: é isso que separa crédito de despesa no Mapa Diário Modelo BM.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-tesouraria"], [data-tour="cash-electronic-account"], [data-tour="nav:/caixa-central"]',
            title: 'Entrega de Valores ao Cofre Central e Reforço de Caixa',
            text: 'Quando o dinheiro em gaveta passa o limite de numerário (75.000 MT por omissão), registas uma <strong>Entrega de Valores ao Cofre Central</strong> com comprovativo. Quando precisas de trocos, pedes um <strong>Reforço de Caixa</strong>. No Caixa Central estão as contas e as transferências.',
            side: 'top'
          },
          {
            el: '[data-tour="caixa-fechar"], [data-tour="caixa-fecho-resultado"], [data-tour="cash-electronic-fecho"], [data-tour="nav:/caixa/historico"]',
            title: 'Fecho em Conferência Cega',
            text: 'No fecho físico o sistema <strong>não mostra</strong> quanto deverias ter — contas e escreves o que contaste; a diferença gera <strong>Auto de Diferença</strong> (conta 58), que o Admin justifica. No modo electrónico reconcilias com o <strong>saldo real do banco</strong>. O resultado de cada dia fica no Histórico Caixa.',
            side: 'bottom'
          }
        ]
      },
      {
        id: 'caixa-central',
        path: '/caixa-central',
        label: 'Caixa Central',
        roles: [1],
        steps: [
          {
            el: '[data-tour="caixa-central"]',
            title: 'A tesouraria da instituição',
            text: 'O Caixa Central junta o dinheiro em caixa e os saldos bancários. É daqui que sai o fundo de maneio para os guichês e para onde vão as entregas de valores.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-central-resumo"], [data-tour="caixa-central-abrir"]',
            title: 'Abrir o dia e ler os seis números',
            text: 'Se ainda não há caixa hoje, clica em <strong>Abrir Caixa do Dia</strong> e conta o fundo de maneio. Depois os seis cartões mostram <strong>fundo de maneio</strong>, <strong>entradas</strong>, <strong>saídas</strong>, <strong>entregas ao cofre</strong>, <strong>saldo final</strong> e <strong>saldo consolidado</strong> (caixa + banco). Se o consolidado não bater com o banco, há um movimento por lançar.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-central-tabs"], [data-tour="nav:/bank-accounts"]',
            title: 'Movimentos, Bancos, Diferenças e Tesouraria',
            text: 'As abas separam o movimento do dia, as <strong>contas bancárias</strong> com saldo real, as <strong>diferenças de caixa</strong> pendentes (quebras e sobras) e o painel de tesouraria. Sem caixa aberto, confirma os saldos em Contas Bancárias.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-central-tesouraria"], [data-tour="nav:/caixa"]',
            title: 'Operações de tesouraria',
            text: 'Depósitos, levantamentos, entregas ao cofre e reforços. Erro comum: registar o depósito no banco e esquecer a saída da gaveta — o caixa fica com dinheiro «fantasma» e o fecho dá quebra. O caixa operacional de cada guichê está em Caixa.',
            side: 'top'
          }
        ]
      },
      {
        id: 'contas-bancarias',
        path: '/bank-accounts',
        label: 'Contas Bancárias',
        roles: [1],
        steps: [
          {
            el: '[data-tour="bank-header"]',
            title: 'O dinheiro real da instituição',
            text: 'Cada conta tem <strong>saldo real</strong>. Desembolsos e reembolsos debitam/creditam estas contas — os saldos das carteiras de financiamento são analíticos e vivem em Financiamento.',
            side: 'bottom'
          },
          {
            el: '[data-tour="bank-kpis"]',
            title: 'Quanto existe e onde está',
            text: 'Os cartões somam os saldos por finalidade (desembolso, reembolso, tesouraria). É este total que tem de bater com os extractos bancários no fim do mês.',
            side: 'bottom'
          },
          {
            el: '[data-tour="bank-list"]',
            title: 'Cada cartão é uma conta',
            text: 'Clica em ⋮ para ver o extracto ou editar. Contas inactivas ficam esbatidas e não podem receber nem pagar — desactivar é melhor do que apagar, para não perder o histórico.',
            side: 'bottom'
          },
          {
            el: '[data-tour="bank-transferir"]',
            title: 'Transferir entre contas',
            text: 'Usa <strong>Transferir</strong> para mover dinheiro entre contas (ex.: do banco para o fundo de maneio). Erro comum: registar a transferência só de um lado — a transferência lança sempre as duas pernas.',
            side: 'bottom'
          }
        ]
      },
      {
        id: 'caixa-historico',
        path: '/caixa/historico',
        label: 'Histórico Caixa',
        roles: [1],
        steps: [
          {
            el: '[data-tour="caixa-hist-kpis"]',
            title: 'Indicadores e Auditoria de Caixas',
            text: 'Resumo executivo do período: <strong>Turnos Filtrados</strong>, <strong>Volume Total Movimentado</strong>, <strong>Índice de Conformidade</strong> (% de turnos sem quebra) e <strong>Divergência Acumulada</strong> ou alertas de regularização pendente.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-hist-filters"]',
            title: 'Filtros Rápidos & Intervalo Personalizado',
            text: 'Utiliza os atalhos (Hoje, 7 Dias, Este Mês, Este Ano) ou selecciona um intervalo de datas e operador específico para auditar turnos passados.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-hist-resumo"]',
            title: 'Divergência e Regularização',
            text: 'O cartão de divergência alerta para quebras ou sobras globais. Se existirem caixas de dias anteriores deixados abertos, o sistema sinaliza a necessidade de <strong>Regularização</strong> imediata.',
            side: 'bottom'
          },
          {
            el: '[data-tour="caixa-hist-table"]',
            title: 'Turnos e Rastreio de Movimentos',
            text: 'Cada linha identifica o operador, horário, saldo inicial, entradas, saídas e a conferência cega. Clica na linha para expandir os movimentos analíticos, comprovativos e o Auto de Diferença.',
            side: 'bottom'
          }
        ]
      }
    ]
  },
  {
    id: 'financiamento',
    label: 'Financiamento',
    pages: [
      {
        id: 'financiamento',
        path: '/financiamento',
        label: 'Carteiras e Taxas',
        roles: [1, 2],
        steps: [
          {
            el: '[data-tour="financing-tabs"]',
            title: 'Carteiras e Taxas de Financiamento',
            text: 'Gere a origem de fundos na aba <strong>Carteiras de Financiamento</strong> (fundos próprios MBRM e investidores parceiros) e os preçários na aba <strong>Taxas de Juro</strong>, vinculados a cada fundo.',
            side: 'bottom'
          },
          {
            el: '[data-tour="financing-wallets"]',
            title: 'Capital, Rentabilidade e Mora Gerada',
            text: 'Cada carteira apresenta 3 blocos executivos: <strong>Capital Alocado</strong>, <strong>Posição de Empréstimo / Recuperação</strong> e <strong>Rentabilidade Líquida com Juros de Mora</strong> calculados em tempo real.',
            side: 'bottom'
          },
          {
            el: '[data-tour="financing-actions"]',
            title: 'Nova Carteira e Classificação',
            text: 'Cria uma carteira por financiador e associa o parceiro. A ferramenta <strong>Classificar créditos antigos</strong> assegura que nenhum mútuo histórico fique sem origem atribuída.',
            side: 'bottom'
          },
          {
            el: '[data-tour="nav:/equipe?tab=parceiros"]',
            title: 'Financiadores no Portal',
            text: 'Os investidores com acesso ao portal visualizam exclusivamente a sua carteira em tempo real. As credenciais de acesso são geridas na aba Parceiros de Equipa.',
            side: 'right'
          }
        ]
      },
      {
        id: 'parceiros',
        path: '/equipe',
        label: 'Equipa e Parceiros',
        roles: [1, 2],
        steps: [
          {
            el: '[data-tour="team-header"]',
            title: 'Equipa MBRM e parceiros',
            text: 'Utilizadores da instituição (Admin, Gestor, Operador) e parceiros financiadores num só lugar. Cada pessoa entra com o seu próprio login — nunca partilhes credenciais.',
            side: 'bottom'
          },
          {
            el: '[data-tour="team-tabs"]',
            title: 'Duas abas, dois mundos',
            text: '<strong>Equipa MBRM</strong> para quem opera o sistema; <strong>Parceiros Financiadores</strong> para quem só vê a sua carteira no portal. O perfil define tudo o que a pessoa pode fazer.',
            side: 'bottom'
          },
          {
            el: '[data-tour="team-list"]',
            title: 'Perfis e permissões',
            text: 'Admin vê tudo, Gestor fica limitado à carteira dele e às aprovações até 25.000 MT, Operador registra mutuários e pagamentos. Desactivar é melhor do que apagar: preserva o histórico de quem lançou os movimentos.',
            side: 'bottom'
          },
          {
            el: '[data-tour="team-novo"]',
            title: 'Criar um membro',
            text: '<strong>Novo Membro</strong> cria o login e envia as credenciais. Erro comum: dar perfil de Admin a quem só precisa de cobrar — começa sempre pelo perfil mais restrito.',
            side: 'bottom'
          }
        ]
      },
      {
        id: 'relatorio-financiadores',
        path: '/reports/financiadores',
        label: 'Relatório Financiadores',
        roles: [1, 2],
        steps: [
          {
            el: '[data-tour="fin-rep-filtros"]',
            title: 'Escolhe a carteira e o período',
            text: 'O relatório mostra <strong>apenas</strong> os desembolsos e recebimentos da carteira escolhida — é isso que garante a separação entre financiadores. Usa os atalhos Hoje / 7 dias / Este mês.',
            side: 'bottom'
          },
          {
            el: '[data-tour="fin-rep-acoes"]',
            title: 'Enviar por e-mail, Excel ou PDF',
            text: '<strong>Enviar por e-mail</strong> manda o relatório ao parceiro configurado na carteira. O Excel traz duas abas (desembolsos e recebimentos); o PDF é a versão para assinar.',
            side: 'bottom'
          },
          {
            el: '[data-tour="fin-rep-kpis"], [data-tour="nav:/financiamento"]',
            title: 'Capital, recebido e em atraso',
            text: 'Cada cartão explica por si: capital alocado, desembolsado, recebido, mora e saldo. Sem carteira escolhida não há números — cria ou escolhe a carteira em Carteiras e Taxas. Erro comum: enviar ao financiador um período que inclui movimentos de outra carteira; confirma o código no cabeçalho.',
            side: 'bottom'
          },
          {
            el: '[data-tour="fin-rep-desembolsos"], [data-tour="nav:/loans"]',
            title: 'A lista que sustenta os números',
            text: 'Cada desembolso tem mutuário, data, valor e taxa. O total tem de bater com o cartão «Desembolsado» acima; se não bater, há créditos por classificares. Os desembolsos nascem em Créditos.',
            side: 'bottom'
          }
        ]
      }
    ]
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    pages: [
      {
        id: 'relatorio-bm',
        path: '/reports/banco-mocambique',
        label: 'Relatório BM',
        roles: [1],
        steps: [
          {
            el: '[data-tour="bm-form"]',
            title: 'Mapa Diário Modelo BM',
            text: 'Escolhe o período trimestral ou mensal e clica em Gerar. Os <strong>Dados Regulamentares da Instituição</strong> (NUIT, Sede, Bairro, Cidade, Número de Trabalhadores) vêm directamente das Configurações da Empresa e compõem o cabeçalho oficial do PDF e Excel.',
            side: 'bottom'
          },
          {
            el: '[data-tour="bm-export"]',
            title: 'Exportar para o Banco de Moçambique',
            text: '<strong>PDF</strong> é a via de entrega; <strong>Excel</strong> serve para conferir e reenviar. Erro comum: exportar antes de gerar — sem dados o botão fica desactivado.',
            side: 'bottom'
          },
          {
            el: '[data-tour="bm-table"]',
            title: 'Operações de crédito (em Metical)',
            text: 'Cada linha é um crédito com desembolso, prestação, taxa, dívida, vencido e PPE. O <strong>PAR</strong> e a <strong>mora</strong> só contam crédito vencido — confere a data de referência antes de assinar.',
            side: 'bottom'
          }
        ]
      }
    ]
  },
  {
    id: 'sistema',
    label: 'Sistema',
    pages: [
      {
        id: 'configuracoes',
        path: '/settings',
        label: 'Configurações',
        roles: [1],
        steps: [
          {
            el: '[data-tour="settings-nav"]',
            title: 'O menu das configurações',
            text: '<strong>Empresa</strong> (dados gerais e <strong>Identificação Regulamentar para o Banco de Moçambique</strong>), <strong>Contas Bancárias</strong>, <strong>Caixa</strong>, <strong>Permissões</strong> e <strong>Aparência</strong>. Os dados da empresa saem impressos em contratos, recibos e relatórios oficiais.',
            side: 'right'
          },
          {
            el: '[data-tour="settings-content"]',
            title: 'Alterar e guardar',
            text: 'Cada secção tem o seu próprio botão de guardar. Erro comum: mudar o NUIT e não guardar — os documentos continuam a sair com o NUIT antigo. Confirma sempre a mensagem de sucesso.',
            side: 'left'
          },
          {
            el: '[data-tour="settings-danger-zone"]',
            title: 'Administração do Sistema (Zona de Perigo)',
            text: 'Este atalho leva ao <strong>Reset Geral de Dados Operacionais</strong>, que apaga mutuários, créditos e recibos. Só o Admin vê este item e só em instalação single-tenant.',
            side: 'right'
          }
        ]
      },
      {
        id: 'mensagens',
        path: '/sms/pendentes',
        label: 'Mensagens',
        roles: [1, 3],
        steps: [
          {
            el: '[data-tour="sms-kpis"]',
            title: 'Fluxo e Eficácia de Comunicações',
            text: 'Métricas em tempo real da fila: mensagens aguardando processamento, total entregue com sucesso, taxa de eficácia de entrega e alertas de falhas que exigem correcção de contacto.',
            side: 'bottom'
          },
          {
            el: '[data-tour="sms-filters"]',
            title: 'Filtros por Assunto e Estado',
            text: 'Filtra por assunto (credenciais de acesso, avisos de vencimento, juros de mora, recibos ou fechos administrativos) e por estado. O banner superior alerta caso o Gateway SMS esteja desligado.',
            side: 'bottom'
          },
          {
            el: '[data-tour="sms-table"], [data-tour="sms-vazio"]',
            title: 'Destinatários e Contacto Directo WhatsApp',
            text: 'Visualiza o destinatário (mutuário ou equipa interna), telefone com indicativo internacional e ícone para iniciar conversa directa no WhatsApp sem precisar gravar o contacto na agenda.',
            side: 'bottom'
          },
          {
            el: '[data-tour="sms-acoes"], [data-tour="nav:/mutuarios"]',
            title: 'Pré-visualização e Reenvio Seguro',
            text: 'Clica no olho para ler a mensagem completa e a contagem de caracteres. O botão reenviar repõe a mensagem na fila após confirmares o número correcto.',
            side: 'left'
          }
        ]
      },
      {
        id: 'onboarding',
        path: '/onboarding',
        label: 'Onboarding da Equipa',
        roles: [1],
        steps: [
          {
            el: '[data-tour="onb-header"]',
            title: 'Quem já fez o primeiro dia',
            text: 'Este painel mostra o progresso do checklist de arranque de cada colega. O progresso é da conta — segue a pessoa entre dispositivos.',
            side: 'bottom'
          },
          {
            el: '[data-tour="onb-kpis"]',
            title: 'Os números da equipa',
            text: 'Total de utilizadores, quem completou, quem está a meio e quem ainda não começou. Serve para saberes quem precisa de acompanhamento na primeira semana.',
            side: 'bottom'
          },
          {
            el: '[data-tour="onb-filtros"]',
            title: 'Filtrar por perfil e estado',
            text: 'Filtra por <strong>perfil</strong> e por <strong>estado</strong> (concluído, em curso, por começar). «Incluir inactivos» mostra também quem já saiu da empresa.',
            side: 'bottom'
          },
          {
            el: '[data-tour="onb-tabela"]',
            title: 'A próxima tarefa de cada pessoa',
            text: 'A barra mostra as tarefas concluídas e a coluna «Próximo passo» diz o que falta. Erro comum: cobrar o onboarding sem dar acesso — confirma o login antes de cobrar a tarefa.',
            side: 'bottom'
          }
        ]
      },
      {
        id: 'historico',
        path: '/logs',
        label: 'Histórico',
        roles: [1],
        steps: [
          {
            el: '[data-tour="logs-kpis"]',
            title: 'Painel Executivo de Auditoria',
            text: 'Total de eventos auditáveis, volume de logins/autenticações hoje, operações financeiras de crédito/pagamento e utilizadores activos no período analisado.',
            side: 'bottom'
          },
          {
            el: '[data-tour="logs-filters"]',
            title: 'Pesquisa e Filtros por Módulo',
            text: 'Localiza qualquer evento pesquisando por utilizador, acção, IP ou descrição. Utiliza os atalhos rápidos (Logins, Créditos, Pagamentos, Eliminações) para investigações imediatas.',
            side: 'bottom'
          },
          {
            el: '[data-tour="logs-table"]',
            title: 'Trilho Imutável de Auditoria',
            text: 'Registo cronológico e protegido contra adulteração com data/hora, perfil do operador, módulo, tipo de acção e endereço IP de origem. Clica no olho para visualizar todos os parâmetros.',
            side: 'bottom'
          },
          {
            el: '[data-tour="logs-export"]',
            title: 'Exportação e Expurgo Regulamentar',
            text: 'Exporta o relatório oficial em PDF ou folha de cálculo Excel para arquivo ou inspecção do Banco de Moçambique. O expurgo de registos antigos (>90 ou 180 dias) é estritamente controlado para Administradores.',
            side: 'left'
          }
        ]
      },
      {
        id: 'administracao-sistema',
        path: '/admin/sistema/reset',
        label: 'Administração do Sistema',
        roles: [1],
        steps: [
          {
            el: '[data-tour="reset-header"]',
            title: 'Zona de Perigo: operações irreversíveis',
            text: () =>
              'Esta página só existe para o <strong>Admin</strong> e só em instalações single-tenant. Tudo o que fizeres aqui <strong>não pode ser desfeito</strong>. Os números dos passos seguintes são os <strong>registos reais desta base</strong>, lidos do servidor antes de confirmares — não são exemplos.',
            side: 'bottom'
          },
          {
            el: '[data-tour="reset-deleted"]',
            title: 'O que é APAGADO',
            text: () => {
              const facts = tourFacts.reset
              if (!facts.loaded) return 'A contar no servidor quantos registos vão desaparecer…'
              if (!facts.available) {
                const why = facts.blocked
                  ? 'O Reset está bloqueado nesta instalação (só funciona em single-tenant com SINGLE_TENANT_COMPANY_ID e com o Admin), por isso o servidor não devolve contagens.'
                  : 'Não foi possível ler as contagens do servidor agora.'
                return `${why} Sem números, guia-te pelo que o Reset apaga: <strong>todos os mutuários, créditos, prestações, pagamentos e recibos fiscais</strong>. Erro comum: fazer reset sem exportar primeiro o mapa diário e os relatórios do mês — depois já não há dados para exportar.`
              }
              const rows = (table) => formatCount(resetRowsOf(table))
              return (
                `O Reset apaga <strong>${formatCount(facts.totalRecords)} registo(s)</strong> em ` +
                `${facts.deleted.length} tabelas — ${rows('customers')} mutuário(s), ` +
                `${rows('customer_loans')} crédito(s), ${rows('amortization_loans')} prestação(ões), ` +
                `${rows('tranzactions')} pagamento(s) e ${rows('recibos')} recibo(s) fiscal(is). ` +
                'Erro comum: fazer reset sem exportar primeiro o mapa diário e os relatórios do mês — depois já não há dados para exportar.'
              )
            },
            ready: () => tourFacts.reset.loaded,
            side: 'bottom'
          },
          {
            el: '[data-tour="reset-zeroed"]',
            title: 'O que é MANTIDO com saldos zerados',
            text: () => {
              const facts = tourFacts.reset
              if (!facts.loaded) return 'A confirmar no servidor as tabelas que ficam a zero…'
              if (!facts.available) {
                return 'As contas, as carteiras de financiamento e o contador dos recibos continuam a existir, mas ficam com saldo e contador a zero.'
              }
              const accounts = formatCount(resetRowsOf('accounts', 'zeroed'))
              const wallets = formatCount(resetRowsOf('financing_wallets', 'zeroed'))
              return (
                `Estas <strong>${facts.zeroed.length} tabelas continuam a existir</strong> mas ficam a zero: ` +
                `<strong>${accounts} conta(s)</strong> bancárias / M-Pesa e <strong>${wallets} carteira(s)</strong> ` +
                'de financiamento mantêm-se cadastradas com saldo 0,00, e o contador fiscal dos recibos volta ao início. ' +
                'O dinheiro real só volta ao sistema com um novo <strong>Aporte</strong> ou <strong>Reforço de Caixa</strong>. ' +
                'Erro comum: começar a pagar despesas depois do reset sem repor saldo — a caixa fica negativa.'
              )
            },
            ready: () => tourFacts.reset.loaded,
            side: 'bottom'
          },
          {
            el: '[data-tour="reset-kept"]',
            title: 'O que continua exactamente como está',
            text: () => {
              const facts = tourFacts.reset
              if (!facts.loaded) return 'A confirmar no servidor o que é preservado…'
              const keptCount = facts.available ? facts.kept.length : 0
              const prefix = keptCount
                ? `Estas <strong>${keptCount} tabelas de estrutura mantêm-se na base</strong> — `
                : 'A estrutura da base mantém-se — '
              if (!facts.available) {
                return (
                  prefix +
                  'utilizadores (Admin, Gestores, Operadores, Parceiros), dados da empresa (nome, NUIT), ' +
                  'taxas de juro, regras de aprovação e templates. <strong>Nenhum utilizador é apagado.</strong> ' +
                  'Os recibos voltam ao <strong>nº 1</strong>, como a AT de Moçambique exige numa série nova.'
                )
              }
              const users = formatCount(resetRowsOf('users', 'kept'))
              const companies = formatCount(resetRowsOf('companies', 'kept'))
              const rates = formatCount(resetRowsOf('interest_rates', 'kept'))
              const rules = formatCount(resetRowsOf('approval_rules', 'kept'))
              return (
                prefix +
                `<strong>${users} utilizador(es), ${companies} empresa(s), ${rates} taxa(s) de juro e ` +
                `${rules} regra(s) de aprovação</strong>. Nenhum utilizador é apagado. ` +
                'Os recibos voltam ao <strong>nº 1</strong>, como a AT de Moçambique exige numa série nova. ' +
                'Erro comum: pensar que o reset limpa a equipa — para remover um colega vai a Equipa e Parceiros.'
              )
            },
            ready: () => tourFacts.reset.loaded,
            side: 'bottom'
          },
          {
            el: '[data-tour="reset-button"]',
            title: 'Backup automático antes de apagar',
            text: () => {
              const facts = tourFacts.reset
              const total =
                facts.loaded && facts.available
                  ? ` Vais confirmar a eliminação de <strong>${formatCount(facts.totalRecords)} registo(s)</strong> — escreve <strong>RESETAR</strong> e a tua senha.`
                  : ' Para executar tens de escrever <strong>RESETAR</strong> e a tua senha.'
              return (
                'Antes de apagar, o servidor grava <code>/backups/backup_pre_reset_*.sql</code> e registra quem, quando e de que IP.' +
                total +
                ' Erro comum: fazer reset sem copiar o backup para outro disco — o ficheiro fica no servidor.'
              )
            },
            ready: () => tourFacts.reset.loaded,
            side: 'top'
          }
        ]
      }
    ]
  }
]

/** Todas as páginas achatadas (ordem do menu). */
export const ALL_TOUR_PAGES = PAGE_TOURS.flatMap((section) =>
  section.pages.map((page) => ({ ...page, sectionId: section.id, sectionLabel: section.label }))
)

/** Normaliza um caminho: sem query/hash nem barra final. */
export function normalizeTourPath(path) {
  const raw = String(path ?? '')
  const clean = raw.split('?')[0].split('#')[0]
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1)
  return clean || '/'
}

/**
 * Página de tour correspondente ao caminho (rota exacta ou padrão) e ao perfil.
 * Devolve `null` quando a página ainda não tem passos — só nesse caso o botão de
 * ajuda mostra o aviso de «ainda não tem passos».
 */
export function findPageTour(path, roleValue) {
  const clean = normalizeTourPath(path)
  const page = ALL_TOUR_PAGES.find(
    (entry) => entry.path === clean || (entry.pattern && entry.pattern.test(clean))
  )
  if (!page) return null
  if (roleValue !== undefined && roleValue !== null && Array.isArray(page.roles)) {
    if (!page.roles.includes(Number(roleValue))) return null
  }
  return page
}

/** Páginas disponíveis para um perfil (usado no contador «Primeiro dia»). */
export function pageToursForRole(roleValue) {
  const role = Number(roleValue)
  return ALL_TOUR_PAGES.filter((entry) => !Array.isArray(entry.roles) || entry.roles.includes(role))
}
