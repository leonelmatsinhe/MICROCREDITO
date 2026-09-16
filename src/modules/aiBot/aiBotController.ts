import * as jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { db } from "../../database/db";
import { UserModel } from "../../database/models/UserModel";
import { AI_TOOLS, TOOL_IMPLEMENTATIONS, BotIdentity } from "./aiTools";

/**
 * AI BOT MAISMOLA — Controller (Fase 2 do MAISMOLA_BOT_AUDIT.md)
 *
 * REGRAS DE OURO:
 *  1. READ-ONLY: nenhuma tool faz UPDATE/INSERT/DELETE. Ações financeiras são
 *     recusadas pelo system prompt e nunca chegam a SQL.
 *  2. resolveIdentity: igual ao CashRegisterController — JWT → userId → companyId
 *     buscado na tabela `users`. companyId NUNCA vem do prompt.
 *  3. Toda query parametrizada com replacements { companyId }.
 *  4. MZN e pt-MZ.
 */

interface GroqChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

const resolveIdentity = async (req: Request): Promise<BotIdentity | null> => {
  try {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");
    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
    const userId = Number(decoded?.id) || 0;
    if (!userId) return null;

    const user: any = await UserModel.findByPk(userId, {
      attributes: ["id", "companyId", "name"],
    });
    const companyId =
      Number(decoded?.companyId) ||
      Number(user?.getDataValue?.("companyId") ?? user?.companyId) ||
      0;
    if (!companyId) return null;

    return {
      userId,
      companyId,
      userName: String(user?.getDataValue?.("name") ?? ""),
    };
  } catch {
    return null;
  }
};

const SYSTEM_PROMPT = (companyId: number): string =>
  `Você é o assistente do MaisMola Microcrédito. Empresa (companyId): ${companyId}. ` +
  `Você SÓ consulta dados (leitura). NUNCA execute, sugira nem prometa acções financeiras ` +
  `(desembolsar, receber pagamento, estornar, fechar/abrir caixa, alterar taxas). ` +
  `Se pedirem qualquer acção dessas, responda exactamente: ` +
  `"Ação não permitida pelo bot. Use o menu Caixa/Pagamentos." ` +
  `Entenda português de Moçambique: "quanto o cliente 108 deve", "caixa de hoje", "quem vence hoje", "saldo do BIM". ` +
  `Moeda: MZN (formato 1.234,56 MZN quando possível). ` +
  `Toda consulta já é filtrada por companyId automaticamente — nunca peça nem repita o companyId do utilizador. ` +
  `Responda de forma curta e clara, com os números principais em destaque.`;

// Bloqueio duro de ações vermelhas (defesa em profundidade, além do system prompt).
// Padrões de COMANDO (imperativo) — consultas como "quanto desembolsamos hoje?"
// ou "total desembolsado" NÃO são bloqueadas (são leitura, tool própria).
const BLOCKED_PATTERNS: RegExp[] = [
  /desembols(a|ar|e|emos|ar\s+|a\s+)/i,
  /lan(ç|c)a(r|ndo)?\s+(o\s+)?(pagamento|pago)/i,
  /regist(ar|a|rar)\s+(o\s+)?(pagamento|pago)/i,
  /estorn(a|ar|o\s)/i,
  /apag(a|ar|ue)/i, /elimin(a|ar)/i, /exclu(i|í)(r|a)/i,
  /fech(a|ar|e)\s*(o\s*)?caixa/i, /abrir\s*(o\s*)?caixa/i,
  /alter(a|ar|e)\s*(a\s*)?(taxa|juro)/i, /mud(a|ar|a)\s*(a\s*)?(taxa|juro)/i,
  /perdo(a|ar)/i, /cancel(a|ar)\s*d[ií]vida/i,
  /transfer(a|ir|e)\s+(dinheiro|saldo|valor|para)/i,
  /deposit(a|ar|e)\s+\d/i,
  /delete\s+from/i, /drop\s+table/i, /update\s+\w+\s+set/i, /insert\s+into/i,
  // Imperativos genéricos de dinheiro: "paga", "recebe", "create loan"
  /^\s*(paga|pagar|recebe|receber|faz|fazer|create|cria|criar)\b.*\b(crédito|credito|loan|pagamento|pago)\b/i,
];

// Frases claramente de CONSULTA: se presentes, nunca bloquear (leitura).
const READ_PATTERNS: RegExp[] = [
  /quanto\b.*(desembols|receb|entrou|saiu|deve|devo)/i,
  /(total|quanto|valor|saldo|lista|ranking|quem|quais)\b.*(desembols|recebido|entrou|saiu|em\s*atraso|vence|carteira|caixa)/i,
  /(estado|resumo|movimentos)\b/i,
  /^(consult|ver|mostrar|mostre|qual|quais|quantos|quantas|como\s+vai)/i,
  /\?$/,
];

const isBlockedQuery = (q: string): boolean => {
  // Pergunta de leitura explícita → nunca bloquear.
  if (READ_PATTERNS.some((rx) => rx.test(q))) return false;
  return BLOCKED_PATTERNS.some((rx) => rx.test(q));
};

const getGroqClient = async (): Promise<any> => {
  const { default: Groq } = await import("groq-sdk");
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

// Modelo configurável via .env (GROQ_MODEL) — fallback: gpt-oss-120b.
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const gr = (v: unknown): number => Math.round(Number(v || 0) * 100) / 100;
const mzn = (v: unknown): string =>
  `${gr(v).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;

// Gera resposta em texto curto pt-MZ a partir do resultado da tool (fallback).
const shortAnswer = (tool: string, data: any): string => {
  try {
    if (tool === "consultar_cliente") {
      if (!data.encontrado) return data.mensagem || "Cliente não encontrado.";
      const linhas = [
        `Cliente ${data.cliente.accountNumber} — ${data.cliente.nome}`,
        `Saldo pendente: ${mzn(data.saldo_pendentes_mzn)} (${data.parcelas_pendentes} prestação(ões))`,
      ];
      if (data.parcelas_em_atraso > 0) {
        linhas.push(`Em atraso: ${data.parcelas_em_atraso} parcela(s) — ${mzn(data.valor_em_atraso)}`);
      }
      if (gr(data.mora_registada_mzn) > 0) linhas.push(`Mora registada: ${mzn(data.mora_registada_mzn)}`);
      return linhas.join(" · ");
    }
    if (tool === "estado_caixa_hoje") {
      if (!data.caixa) return data.mensagem || "Sem caixa hoje.";
      const c = data.caixa;
      const linhas = [
        `Caixa ${data.status === "ABERTO" ? "ABERTO" : "FECHADO"}`,
        `Abertura: ${mzn(c.opening_balance)}`,
        `Entradas: ${mzn(c.total_in)} · Saídas: ${mzn(c.total_out)}`,
        `Cash: +${mzn(c.total_cash_in)} / -${mzn(c.total_cash_out)} · Electrónico: +${mzn(c.total_bank_in)} / -${mzn(c.total_bank_out)}`,
      ];
      if (c.closing_balance_calculated != null) {
        linhas.push(`Saldo calculado: ${mzn(c.closing_balance_calculated)}`);
        if (c.difference != null) linhas.push(`Diferença: ${mzn(c.difference)}`);
      }
      return linhas.join(" · ");
    }
    if (tool === "vencimentos_hoje") {
      if (!data.total) return "Nenhum vencimento para hoje. 🎉";
      return `${data.total} prestação(ões) vencem hoje — total ${mzn(data.total_valor_mzn)}.`;
    }
    if (tool === "saldo_carteiras") {
      if (!data.carteiras?.length) return "Nenhuma carteira activa.";
      const detalhe = data.carteiras.map((c: any) => `${c.descricao || c.banco}: ${mzn(c.saldo_mzn)}`);
      return `Total: ${mzn(data.total_mzn)} · ${detalhe.join(" · ")}`;
    }
    if (tool === "total_desembolsado_hoje") {
      const metodos = Object.entries(data.por_metodo || {})
        .map(([m, v]: any) => `${m}: ${mzn(v)}`)
        .join(" · ");
      return (
        `Desembolsado em ${data.data}: ${mzn(data.total_mzn)} ` +
        `(${data.total_desembolsos} desembolso(s), ${data.caixas_envolvidos} caixa(s)` +
        (metodos ? ` · ${metodos}` : "") + ")"
      );
    }
    if (tool === "prestacoes_atraso_cliente") {
      if (!data.encontrado) return data.mensagem || "Cliente não encontrado.";
      if (!data.quantidade) return "Nenhuma prestação em atraso para este cliente. 🎉";
      return (
        `Cliente ${data.cliente.accountNumber} — ${data.cliente.nome}: ` +
        `${data.quantidade} prestação(ões) em atraso, total ${mzn(data.total_em_atraso_mzn)}, ` +
        `maior atraso ${data.maior_atraso_dias} dia(s).`
      );
    }
    if (tool === "clientes_em_atraso") {
      if (!data.total_clientes) return "Nenhum cliente em atraso. 🎉";
      const top3 = data.ranking
        .slice(0, 3)
        .map(
          (r: any) =>
            `${r.posicao}º ${r.cliente} (conta ${r.conta}) — ${mzn(r.valor_atraso_mzn)}, ${r.maior_atraso_dias} dia(s)`
        );
      return (
        `${data.total_clientes} cliente(s) em atraso — total ${mzn(data.total_valor_mzn)}. ` +
        `Top: ${top3.join(" · ")}`
      );
    }
    if (tool === "movimentos_caixa_hoje") {
      if (!data.movimentos?.length) return data.mensagem || "Sem movimentos hoje.";
      const ent = data.movimentos
        .filter((m: any) => m.tipo === "ENTRADA")
        .reduce((s: number, m: any) => s + m.valor_mzn, 0);
      const sai = data.movimentos
        .filter((m: any) => m.tipo === "SAIDA")
        .reduce((s: number, m: any) => s + m.valor_mzn, 0);
      return `${data.total_movimentos} movimento(s) · Entradas ${mzn(ent)} · Saídas ${mzn(sai)}`;
    }
  } catch {
    /* fallback abaixo */
  }
  return "Consulta concluída.";
};

// Log de auditoria em user_logs (best-effort — nunca quebra a resposta).
const logBotUsage = async (
  identity: BotIdentity,
  pergunta: string,
  toolUsed: string
): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO user_logs (companyId, userId, userName, description, action, createdAt, updatedAt)
       VALUES (:companyId, :userId, :userName, :description, :action, NOW(), NOW())`,
      {
        replacements: {
          companyId: identity.companyId,
          userId: identity.userId,
          userName: identity.userName || "bot",
          description: `[AI Bot] ${String(pergunta).slice(0, 200)}`,
          action: `AI_BOT:${toolUsed || "BLOQUEADO"}`,
        },
      }
    );
  } catch (e: any) {
    console.error("[aiBot] Falha ao gravar user_logs:", e?.message || e);
  }
};

export const queryBot = async (req: Request, res: Response): Promise<Response> => {
  try {
    const identity = await resolveIdentity(req);
    if (!identity) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const pergunta = String(req.body?.query || "").trim();
    if (!pergunta) {
      return res.status(400).json({ success: false, message: "Pergunta é obrigatória." });
    }
    if (pergunta.length > 500) {
      return res.status(400).json({ success: false, message: "Pergunta demasiado longa." });
    }

    // Defesa em profundidade: pedidos de acção financeira são bloqueados antes do LLM.
    if (isBlockedQuery(pergunta)) {
      await logBotUsage(identity, pergunta, "");
      return res.status(200).json({
        success: true,
        pergunta,
        tool_used: null,
        args: null,
        data: null,
        resposta_em_texto_curto: "Ação não permitida pelo bot. Use o menu Caixa/Pagamentos.",
      });
    }

    const groq = await getGroqClient();
    const messages: GroqChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT(identity.companyId) },
      { role: "user", content: pergunta },
    ];

    // 1ª chamada: o modelo escolhe a tool (ou recusa a acção).
    const completion: any = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.1,
      messages: messages as any,
      tools: AI_TOOLS as any,
      tool_choice: "auto",
    });

    const choice: any = completion.choices?.[0]?.message;
    const toolCalls: any[] = choice?.tool_calls || [];

    if (!toolCalls.length) {
      // Modelo respondeu em texto (ex.: recusa de acção financeira).
      const texto =
        String(choice?.content || "").trim() ||
        "Não entendi a pergunta. Tente: 'Cliente 108 deve quanto?', 'Estado da caixa hoje', 'Vencimentos de hoje', 'Saldo das carteiras'.";
      await logBotUsage(identity, pergunta, "(texto)");
      return res.status(200).json({
        success: true,
        pergunta,
        tool_used: null,
        args: null,
        data: null,
        resposta_em_texto_curto: texto,
      });
    }

    // Executa a(s) tool(s) escolhida(s) — apenas as implementadas e read-only.
    messages.push(choice as GroqChatMessage);
    let lastTool = "";
    let lastArgs: any = null;
    let lastData: any = null;

    for (const call of toolCalls) {
      const name: string = call?.function?.name;
      const impl = TOOL_IMPLEMENTATIONS[name];
      if (!impl) {
        lastTool = name;
        lastData = { erro: `Tool desconhecida: ${name}` };
        continue;
      }
      let args: any = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      // Groq envia null/undefined em parâmetros opcionais — normalizar ANTES de
      // executar (a validação de schema é feita no lado do Groq, mas o valor
      // null pode também chegar aqui).
      if (args && typeof args === "object") {
        for (const k of Object.keys(args)) {
          if (args[k] === null || args[k] === undefined) delete args[k];
        }
      }
      // Segurança: args nunca podem trazer companyId/userId — apagar se vierem.
      delete args.companyId;
      delete args.userId;
      // Groq envia null em parâmetros opcionais não preenchidos — remover.
      for (const k of Object.keys(args)) {
        if (args[k] === null || args[k] === undefined) delete args[k];
      }

      lastTool = name;
      lastArgs = args;
      lastData = await impl(identity, args);

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(lastData),
      });
    }

    // 2ª chamada: o modelo redige a resposta final com o resultado da tool.
    const final: any = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.1,
      messages: messages as any,
    });
    const respostaFinal = String(final.choices?.[0]?.message?.content || "").trim();

    await logBotUsage(identity, pergunta, lastTool);

    return res.status(200).json({
      success: true,
      pergunta,
      tool_used: lastTool,
      args: lastArgs,
      data: lastData,
      resposta_em_texto_curto: respostaFinal || shortAnswer(lastTool, lastData),
    });
  } catch (error: any) {
    console.error("[aiBot] Erro:", error?.message || error);
    const status = error?.status === 401 ? 401 : 500;
    return res.status(status).json({
      success: false,
      message:
        status === 401
          ? "Token invalid"
          : "O assistente está indisponível neste momento. Tente novamente.",
    });
  }
};
