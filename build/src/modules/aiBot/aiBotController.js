"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryBot = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = require("../../database/db");
const UserModel_1 = require("../../database/models/UserModel");
const aiTools_1 = require("./aiTools");
const resolveIdentity = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const authHeader = req.headers.authorization || "";
        const [, token] = authHeader.split(" ");
        if (!token)
            return null;
        const decoded = jwt.verify(token, process.env.APP_SECRET + "");
        const userId = Number(decoded === null || decoded === void 0 ? void 0 : decoded.id) || 0;
        if (!userId)
            return null;
        const user = yield UserModel_1.UserModel.findByPk(userId, {
            attributes: ["id", "companyId", "name"],
        });
        const companyId = Number(decoded === null || decoded === void 0 ? void 0 : decoded.companyId) ||
            Number((_b = (_a = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _a === void 0 ? void 0 : _a.call(user, "companyId")) !== null && _b !== void 0 ? _b : user === null || user === void 0 ? void 0 : user.companyId) ||
            0;
        if (!companyId)
            return null;
        return {
            userId,
            companyId,
            userName: String((_d = (_c = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _c === void 0 ? void 0 : _c.call(user, "name")) !== null && _d !== void 0 ? _d : ""),
        };
    }
    catch (_e) {
        return null;
    }
});
const SYSTEM_PROMPT = (companyId) => `Você é o assistente do MaisMola Microcrédito. Empresa (companyId): ${companyId}. ` +
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
const BLOCKED_PATTERNS = [
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
const READ_PATTERNS = [
    /quanto\b.*(desembols|receb|entrou|saiu|deve|devo)/i,
    /(total|quanto|valor|saldo|lista|ranking|quem|quais)\b.*(desembols|recebido|entrou|saiu|em\s*atraso|vence|carteira|caixa)/i,
    /(estado|resumo|movimentos)\b/i,
    /^(consult|ver|mostrar|mostre|qual|quais|quantos|quantas|como\s+vai)/i,
    /\?$/,
];
const isBlockedQuery = (q) => {
    // Pergunta de leitura explícita → nunca bloquear.
    if (READ_PATTERNS.some((rx) => rx.test(q)))
        return false;
    return BLOCKED_PATTERNS.some((rx) => rx.test(q));
};
const getGroqClient = () => __awaiter(void 0, void 0, void 0, function* () {
    const { default: Groq } = yield Promise.resolve().then(() => __importStar(require("groq-sdk")));
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
});
// Modelo configurável via .env (GROQ_MODEL) — fallback: gpt-oss-120b.
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const gr = (v) => Math.round(Number(v || 0) * 100) / 100;
const mzn = (v) => `${gr(v).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
// Gera resposta em texto curto pt-MZ a partir do resultado da tool (fallback).
const shortAnswer = (tool, data) => {
    var _a, _b;
    try {
        if (tool === "consultar_cliente") {
            if (!data.encontrado)
                return data.mensagem || "Cliente não encontrado.";
            const linhas = [
                `Cliente ${data.cliente.accountNumber} — ${data.cliente.nome}`,
                `Saldo pendente: ${mzn(data.saldo_pendentes_mzn)} (${data.parcelas_pendentes} prestação(ões))`,
            ];
            if (data.parcelas_em_atraso > 0) {
                linhas.push(`Em atraso: ${data.parcelas_em_atraso} parcela(s) — ${mzn(data.valor_em_atraso)}`);
            }
            if (gr(data.mora_registada_mzn) > 0)
                linhas.push(`Mora registada: ${mzn(data.mora_registada_mzn)}`);
            return linhas.join(" · ");
        }
        if (tool === "estado_caixa_hoje") {
            if (!data.caixa)
                return data.mensagem || "Sem caixa hoje.";
            const c = data.caixa;
            const linhas = [
                `Caixa ${data.status === "ABERTO" ? "ABERTO" : "FECHADO"}`,
                `Abertura: ${mzn(c.opening_balance)}`,
                `Entradas: ${mzn(c.total_in)} · Saídas: ${mzn(c.total_out)}`,
                `Cash: +${mzn(c.total_cash_in)} / -${mzn(c.total_cash_out)} · Electrónico: +${mzn(c.total_bank_in)} / -${mzn(c.total_bank_out)}`,
            ];
            if (c.closing_balance_calculated != null) {
                linhas.push(`Saldo calculado: ${mzn(c.closing_balance_calculated)}`);
                if (c.difference != null)
                    linhas.push(`Diferença: ${mzn(c.difference)}`);
            }
            return linhas.join(" · ");
        }
        if (tool === "vencimentos_hoje") {
            if (!data.total)
                return "Nenhum vencimento para hoje. 🎉";
            return `${data.total} prestação(ões) vencem hoje — total ${mzn(data.total_valor_mzn)}.`;
        }
        if (tool === "saldo_carteiras") {
            if (!((_a = data.carteiras) === null || _a === void 0 ? void 0 : _a.length))
                return "Nenhuma carteira activa.";
            const detalhe = data.carteiras.map((c) => `${c.descricao || c.banco}: ${mzn(c.saldo_mzn)}`);
            return `Total: ${mzn(data.total_mzn)} · ${detalhe.join(" · ")}`;
        }
        if (tool === "total_desembolsado_hoje") {
            const metodos = Object.entries(data.por_metodo || {})
                .map(([m, v]) => `${m}: ${mzn(v)}`)
                .join(" · ");
            return (`Desembolsado em ${data.data}: ${mzn(data.total_mzn)} ` +
                `(${data.total_desembolsos} desembolso(s), ${data.caixas_envolvidos} caixa(s)` +
                (metodos ? ` · ${metodos}` : "") + ")");
        }
        if (tool === "prestacoes_atraso_cliente") {
            if (!data.encontrado)
                return data.mensagem || "Cliente não encontrado.";
            if (!data.quantidade)
                return "Nenhuma prestação em atraso para este cliente. 🎉";
            return (`Cliente ${data.cliente.accountNumber} — ${data.cliente.nome}: ` +
                `${data.quantidade} prestação(ões) em atraso, total ${mzn(data.total_em_atraso_mzn)}, ` +
                `maior atraso ${data.maior_atraso_dias} dia(s).`);
        }
        if (tool === "clientes_em_atraso") {
            if (!data.total_clientes)
                return "Nenhum cliente em atraso. 🎉";
            const top3 = data.ranking
                .slice(0, 3)
                .map((r) => `${r.posicao}º ${r.cliente} (conta ${r.conta}) — ${mzn(r.valor_atraso_mzn)}, ${r.maior_atraso_dias} dia(s)`);
            return (`${data.total_clientes} cliente(s) em atraso — total ${mzn(data.total_valor_mzn)}. ` +
                `Top: ${top3.join(" · ")}`);
        }
        if (tool === "movimentos_caixa_hoje") {
            if (!((_b = data.movimentos) === null || _b === void 0 ? void 0 : _b.length))
                return data.mensagem || "Sem movimentos hoje.";
            const ent = data.movimentos
                .filter((m) => m.tipo === "ENTRADA")
                .reduce((s, m) => s + m.valor_mzn, 0);
            const sai = data.movimentos
                .filter((m) => m.tipo === "SAIDA")
                .reduce((s, m) => s + m.valor_mzn, 0);
            return `${data.total_movimentos} movimento(s) · Entradas ${mzn(ent)} · Saídas ${mzn(sai)}`;
        }
    }
    catch (_c) {
        /* fallback abaixo */
    }
    return "Consulta concluída.";
};
// Log de auditoria em user_logs (best-effort — nunca quebra a resposta).
const logBotUsage = (identity, pergunta, toolUsed) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.db.query(`INSERT INTO user_logs (companyId, userId, userName, description, action, createdAt, updatedAt)
       VALUES (:companyId, :userId, :userName, :description, :action, NOW(), NOW())`, {
            replacements: {
                companyId: identity.companyId,
                userId: identity.userId,
                userName: identity.userName || "bot",
                description: `[AI Bot] ${String(pergunta).slice(0, 200)}`,
                action: `AI_BOT:${toolUsed || "BLOQUEADO"}`,
            },
        });
    }
    catch (e) {
        console.error("[aiBot] Falha ao gravar user_logs:", (e === null || e === void 0 ? void 0 : e.message) || e);
    }
});
const queryBot = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g, _h, _j, _k, _l, _m;
    try {
        const identity = yield resolveIdentity(req);
        if (!identity) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const pergunta = String(((_f = req.body) === null || _f === void 0 ? void 0 : _f.query) || "").trim();
        if (!pergunta) {
            return res.status(400).json({ success: false, message: "Pergunta é obrigatória." });
        }
        if (pergunta.length > 500) {
            return res.status(400).json({ success: false, message: "Pergunta demasiado longa." });
        }
        // Defesa em profundidade: pedidos de acção financeira são bloqueados antes do LLM.
        if (isBlockedQuery(pergunta)) {
            yield logBotUsage(identity, pergunta, "");
            return res.status(200).json({
                success: true,
                pergunta,
                tool_used: null,
                args: null,
                data: null,
                resposta_em_texto_curto: "Ação não permitida pelo bot. Use o menu Caixa/Pagamentos.",
            });
        }
        const groq = yield getGroqClient();
        const messages = [
            { role: "system", content: SYSTEM_PROMPT(identity.companyId) },
            { role: "user", content: pergunta },
        ];
        // 1ª chamada: o modelo escolhe a tool (ou recusa a acção).
        const completion = yield groq.chat.completions.create({
            model: GROQ_MODEL,
            temperature: 0.1,
            messages: messages,
            tools: aiTools_1.AI_TOOLS,
            tool_choice: "auto",
        });
        const choice = (_h = (_g = completion.choices) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.message;
        const toolCalls = (choice === null || choice === void 0 ? void 0 : choice.tool_calls) || [];
        if (!toolCalls.length) {
            // Modelo respondeu em texto (ex.: recusa de acção financeira).
            const texto = String((choice === null || choice === void 0 ? void 0 : choice.content) || "").trim() ||
                "Não entendi a pergunta. Tente: 'Cliente 108 deve quanto?', 'Estado da caixa hoje', 'Vencimentos de hoje', 'Saldo das carteiras'.";
            yield logBotUsage(identity, pergunta, "(texto)");
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
        messages.push(choice);
        let lastTool = "";
        let lastArgs = null;
        let lastData = null;
        for (const call of toolCalls) {
            const name = (_j = call === null || call === void 0 ? void 0 : call.function) === null || _j === void 0 ? void 0 : _j.name;
            const impl = aiTools_1.TOOL_IMPLEMENTATIONS[name];
            if (!impl) {
                lastTool = name;
                lastData = { erro: `Tool desconhecida: ${name}` };
                continue;
            }
            let args = {};
            try {
                args = JSON.parse(call.function.arguments || "{}");
            }
            catch (_o) {
                args = {};
            }
            // Groq envia null/undefined em parâmetros opcionais — normalizar ANTES de
            // executar (a validação de schema é feita no lado do Groq, mas o valor
            // null pode também chegar aqui).
            if (args && typeof args === "object") {
                for (const k of Object.keys(args)) {
                    if (args[k] === null || args[k] === undefined)
                        delete args[k];
                }
            }
            // Segurança: args nunca podem trazer companyId/userId — apagar se vierem.
            delete args.companyId;
            delete args.userId;
            // Groq envia null em parâmetros opcionais não preenchidos — remover.
            for (const k of Object.keys(args)) {
                if (args[k] === null || args[k] === undefined)
                    delete args[k];
            }
            lastTool = name;
            lastArgs = args;
            lastData = yield impl(identity, args);
            messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(lastData),
            });
        }
        // 2ª chamada: o modelo redige a resposta final com o resultado da tool.
        const final = yield groq.chat.completions.create({
            model: GROQ_MODEL,
            temperature: 0.1,
            messages: messages,
        });
        const respostaFinal = String(((_m = (_l = (_k = final.choices) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.message) === null || _m === void 0 ? void 0 : _m.content) || "").trim();
        yield logBotUsage(identity, pergunta, lastTool);
        return res.status(200).json({
            success: true,
            pergunta,
            tool_used: lastTool,
            args: lastArgs,
            data: lastData,
            resposta_em_texto_curto: respostaFinal || shortAnswer(lastTool, lastData),
        });
    }
    catch (error) {
        console.error("[aiBot] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        const status = (error === null || error === void 0 ? void 0 : error.status) === 401 ? 401 : 500;
        return res.status(status).json({
            success: false,
            message: status === 401
                ? "Token invalid"
                : "O assistente está indisponível neste momento. Tente novamente.",
        });
    }
});
exports.queryBot = queryBot;
