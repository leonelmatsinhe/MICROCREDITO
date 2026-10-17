#!/usr/bin/env node
/**
 * AUDITORIA MANUAL × CÓDIGO — FreeBuff Microcrédito
 * ==================================================
 * Compara o que o Manual do Utilizador (docs/MANUAL_UTILIZADOR_FreeBuff_v1.md)
 * afirma sobre ROTAS, PERMISSÕES POR PERFIL, MENUS e FUNCIONALIDADES
 * "[Em desenvolvimento]" com o que o código-fonte real faz hoje.
 *
 * Fontes de verdade lidas por este script (só leitura, nada é alterado):
 *   · web-app-v2/src/router/index.js            → rotas do frontend + allowedRoles
 *   · web-app-v2/src/components/layout/AppSidebar.vue → menu lateral por perfil
 *   · web-app-v2/src/stores/auth.js             → rota inicial (defaultRoute) por perfil
 *   · src/routes.ts, src/routes/*.ts            → rotas da API + guardas de perfil
 *   · ficheiros de UI/controladores citados nas afirmações "[Em desenvolvimento]"
 *
 * Uso:
 *   npm run audit:manual                       (relatório legível)
 *   node scripts/audit-manual.js --json        (relatório em JSON, para CI)
 *   node scripts/audit-manual.js --quiet       (só divergências + resumo)
 *   node scripts/audit-manual.js --manual=outro-manual.md   (audita outra versão)
 *   node scripts/audit-manual.js --self-test   (prova que a auditoria é capaz de falhar)
 *
 * Código de saída:
 *   0 → nenhuma divergência (o manual continua fiel ao código)
 *   1 → há divergências do manual face ao código (actualize o manual)
 *
 * PRINCÍPIO DE DESENHO: este script falha em voz alta quando NÃO consegue
 * interpretar o código (por exemplo, se a estrutura do menu lateral mudar).
 * Uma auditoria que deixa de perceber o código e continua a dizer "tudo OK"
 * é pior do que não existir.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MANUAL_POR_OMISSAO = "docs/MANUAL_UTILIZADOR_FreeBuff_v1.md";

const ARGS = new Set(process.argv.slice(2));
const AS_JSON = ARGS.has("--json");
const QUIET = ARGS.has("--quiet");
const SELF_TEST = ARGS.has("--self-test");
// --manual=<caminho> permite auditar outra versão do manual (ex.: a de ontem,
// num ficheiro temporário) sem tocar no manual do repositório.
const ARG_MANUAL = [...ARGS].find((a) => a.startsWith("--manual="));
const MANUAL = ARG_MANUAL ? ARG_MANUAL.slice("--manual=".length) : MANUAL_POR_OMISSAO;

// ════════════════════════════════════════════════════════════════════════════
// INFRAESTRUTURA DO RELATÓRIO
// ════════════════════════════════════════════════════════════════════════════

const results = [];
const DIVERGENCIAS = [];
const AVISOS = [];
const NAO_VERIFICAVEL = [];

/** Registo de um resultado de verificação. */
function check(seccao, titulo, ok, detalhe, severidade = "erro") {
  const item = { seccao, titulo, ok, detalhe: detalhe || "", severidade };
  results.push(item);
  if (!ok) {
    if (severidade === "erro") DIVERGENCIAS.push(item);
    else if (severidade === "aviso") AVISOS.push(item);
    else NAO_VERIFICAVEL.push(item);
  }
  return ok;
}

function readRepoFile(rel) {
  const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE ANÁLISE DE TEXTO
// ════════════════════════════════════════════════════════════════════════════

/** Devolve o texto dentro do par () [] {} que começa em `openIndex`. */
function matchBalanced(src, openIndex) {
  const pares = { "(": ")", "[": "]", "{": "}" };
  const abre = src[openIndex];
  const fecha = pares[abre];
  if (!fecha) return "";
  let nivel = 0;
  let emString = null;
  for (let i = openIndex; i < src.length; i++) {
    const c = src[i];
    if (emString) {
      if (c === "\\") { i++; continue; }
      if (c === emString) emString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { emString = c; continue; }
    if (c === abre) nivel++;
    else if (c === fecha) {
      nivel--;
      if (nivel === 0) return src.slice(openIndex, i + 1);
    }
  }
  return "";
}

/** Parte um texto por vírgulas de nível superior (respeita () [] {}). */
function splitTopLevel(text) {
  const partes = [];
  let profundidade = 0;
  let emString = null;
  let inicio = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (emString) {
      if (c === "\\") { i++; continue; }
      if (c === emString) emString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { emString = c; continue; }
    if ("([{".includes(c)) profundidade++;
    else if (")]}".includes(c)) profundidade--;
    else if (c === "," && profundidade === 0) {
      partes.push(text.slice(inicio, i).trim());
      inicio = i + 1;
    }
  }
  const ultima = text.slice(inicio).trim();
  if (ultima) partes.push(ultima);
  return partes;
}

function linhaDe(src, index) {
  return src.slice(0, index).split(/\r?\n/).length;
}

/** true se a posição indicada está dentro de uma linha comentada (// ou *). */
function emComentario(src, index) {
  const linhas = src.slice(0, index).split(/\r?\n/);
  const atual = linhas[linhas.length - 1];
  return /^\s*(\/\/|\*|\/\*)/.test(atual);
}

/** Extrai todos os caminhos `/xxx` escritos entre crases (`` ` ``). */
function caminhosEntreCrases(texto) {
  const out = new Set();
  for (const m of texto.matchAll(/`(\/[^`\s]*)`/g)) {
    let p = m[1].replace(/[.,;:]+$/, "");
    if (p.length > 1) out.add(p);
  }
  return [...out];
}

// ════════════════════════════════════════════════════════════════════════════
// 1. MANUAL — extracção das afirmações
// ════════════════════════════════════════════════════════════════════════════

/** Recorta a secção cujo cabeçalho começa pelo prefixo indicado. */
function seccaoDoManual(manual, prefixo) {
  const linhas = manual.split(/\r?\n/);
  let inicio = -1;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].startsWith(prefixo)) { inicio = i; break; }
  }
  if (inicio === -1) return null;
  let fim = linhas.length;
  for (let i = inicio + 1; i < linhas.length; i++) {
    if (/^#{1,3} /.test(linhas[i])) { fim = i; break; }
  }
  return linhas.slice(inicio, fim).join("\n");
}

/** Lê a PRIMEIRA tabela markdown de um bloco de texto. */
function lerTabela(bloco) {
  if (!bloco) return [];
  const linhas = bloco.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  if (linhas.length < 3) return [];
  const celulas = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const cabecalho = celulas(linhas[0]);
  const corpo = linhas.slice(2).map(celulas);
  return corpo.map((linha) => {
    const obj = {};
    cabecalho.forEach((h, i) => { obj[h] = linha[i] !== undefined ? linha[i] : ""; });
    return obj;
  });
}

/** Caminhos de rota citados numa célula de tabela (`` `/x` `` ou `(/x)`). */
function rotasDaCelula(celula) {
  const out = new Set();
  for (const m of celula.matchAll(/[`(](\/[A-Za-z0-9/:_-]*)[`)]/g)) {
    const p = m[1].replace(/[.,;:]+$/, "");
    if (p.length > 1) out.add(p);
  }
  return [...out];
}

function analisarManual() {
  const texto = readRepoFile(MANUAL);
  if (!texto) throw new Error(`Manual não encontrado: ${MANUAL}`);

  // 2.0 — menu lateral do Gestor
  const menuGestor = lerTabela(seccaoDoManual(texto, "### 2.0"))
    .filter((r) => r["Item"] && r["Grupo"])
    .map((r) => ({
      grupo: r["Grupo"].replace(/\*\*/g, "").trim(),
      item: r["Item"].replace(/\*/g, "").trim(),
      destino: r["Para onde leva"] || "",
      rotas: rotasDaCelula(r["Para onde leva"] || ""),
    }));

  // 3.0 — o que o ADMIN tem a mais do que o Gestor
  const areasAdmin = lerTabela(seccaoDoManual(texto, "### 3.0"));

  // Caminhos de rota citados em todo o manual
  const rotasCitadas = caminhosEntreCrases(texto);

  // Afirmações "[Em desenvolvimento]" — só as marcas entre parênteses rectos,
  // que são afirmações do manual; a expressão escrita em prosa (numa frase)
  // não é uma marca.
  const marcasDesenvolvimento = texto
    .split(/\r?\n/)
    .map((l, i) => ({ linha: i + 1, texto: l }))
    .filter((l) => /\[Em desenvolvimento[^\]]*\]/i.test(l.texto));

  return {
    texto,
    linhas: texto.split(/\r?\n/).length,
    menuGestor,
    areasAdmin,
    rotasCitadas,
    marcasDesenvolvimento,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 2. FRONTEND — rotas do router e respectivos perfis
// ════════════════════════════════════════════════════════════════════════════

function analisarRouter() {
  const src = readRepoFile("web-app-v2/src/router/index.js");
  if (!src) throw new Error("Router do frontend não encontrado.");

  const rotas = [];
  let atual = null;

  for (const linha of src.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (/^\/\//.test(limpa)) continue;

    const mPath = limpa.match(/path:\s*['"]([^'"]+)['"]/);
    if (mPath) {
      // Rotas-filhas declaradas de forma relativa (ex.: 'dashboard' dentro de
      // /parceiro) ficam com outro resolvedor; só interessam os caminhos
      // absolutos, que são os que o manual cita.
      if (!mPath[1].startsWith("/")) {
        atual = null;
        continue;
      }
      atual = { path: mPath[1], allowedRoles: null };
      rotas.push(atual);
    }
    const mRoles = limpa.match(/allowedRoles:\s*\[([^\]]*)\]/);
    if (mRoles && atual) {
      atual.allowedRoles = mRoles[1]
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
    }
  }

  // Rotas geradas por map() — /admin/microcredito/<secção>
  const mMap = src.match(/\[([^\]]*)\]\.map\(\(section\)/);
  if (mMap) {
    const seccoes = mMap[1].split(",").map((s) => s.trim().replace(/['"]/g, "")).filter(Boolean);
    const bloco = src.slice(src.indexOf(mMap[0]));
    const roles = bloco.match(/allowedRoles:\s*\[([^\]]*)\]/);
    const allowedRoles = roles
      ? roles[1].split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
      : null;
    for (const s of seccoes) {
      rotas.push({ path: `/admin/microcredito/${s}`, allowedRoles });
    }
  }

  const porCaminho = new Map(rotas.map((r) => [r.path, r]));
  const existe = (p) => porCaminho.has(p);
  const rolesDe = (p) => (porCaminho.has(p) ? porCaminho.get(p).allowedRoles : undefined);
  const permite = (p, role) => {
    const r = rolesDe(p);
    if (r === undefined || !Array.isArray(r)) return null; // sem allowedRoles = qualquer autenticado
    return r.includes(role);
  };

  return { rotas, porCaminho, existe, rolesDe, permite };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. FRONTEND — menu lateral por perfil (AppSidebar.vue)
// ════════════════════════════════════════════════════════════════════════════

/** Lê os grupos `{ id, label, items:[{to,label}] }` de um bloco de código. */
function lerGrupos(bloco) {
  const grupos = [];
  let busca = 0;
  while (true) {
    const idxItems = bloco.indexOf("items: [", busca);
    if (idxItems === -1) break;
    const arr = matchBalanced(bloco, bloco.indexOf("[", idxItems));
    busca = idxItems + arr.length;

    // id/grupo imediatamente antes deste array
    const antes = bloco.slice(0, idxItems);
    const mId = [...antes.matchAll(/id:\s*['"]([^'"]+)['"]/g)].pop();
    const mLabel = [...antes.matchAll(/label:\s*['"]([^'"]+)['"]/g)].pop();

    const itens = [];
    for (const elemento of splitTopLevel(arr.slice(1, -1))) {
      const mTo = elemento.match(/to:\s*['"]([^'"]+)['"]/);
      const mLabel2 = elemento.match(/label:\s*['"]([^'"]+)['"]/);
      if (!mTo || !mLabel2) continue;
      const condicional = elemento.startsWith("...");
      const condicao = condicional ? elemento.slice(3).split("?")[0].trim() : null;
      itens.push({ to: mTo[1], label: mLabel2[1], condicao });
    }

    grupos.push({
      id: mId ? mId[1] : `<desconhecido-${grupos.length}>`,
      label: mLabel ? mLabel[1] : `<desconhecido-${grupos.length}>`,
      items: itens,
    });
  }
  return grupos;
}

function analisarSidebar() {
  const src = readRepoFile("web-app-v2/src/components/layout/AppSidebar.vue");
  if (!src) throw new Error("AppSidebar.vue não encontrado.");

  // Condições declaradas no componente
  const mSms = src.match(/const canSeeSms = computed\(\(\) => \[([\d,\s]+)\]\.includes/);
  const rolesSms = mSms ? mSms[1].split(",").map((n) => Number(n.trim())) : null;

  // Bloco do Super Admin
  const iSuper = src.indexOf("if (isSuperAdmin.value) {");
  const iAll = src.indexOf("const all = [");
  const gruposSuperAdmin = iSuper > -1 && iAll > iSuper
    ? lerGrupos(src.slice(iSuper, iAll))
    : [];

  // Bloco do menu completo
  const iFimAll = src.indexOf("if (role === 1) return all");
  const gruposTodos = iAll > -1 && iFimAll > iAll
    ? lerGrupos(src.slice(iAll, iFimAll))
    : [];

  // Regras por perfil
  const acessoTotal = [...src.matchAll(/if \(role === (\d+)\) return all\b/g)].map((m) => Number(m[1]));
  const regrasFiltro = [...src.matchAll(/if \(\[([\d,\s]+)\]\.includes\(role\)\) return all\.filter\(\(group\) => ([^\n]+)/g)]
    .map((m) => ({
      roles: m[1].split(",").map((n) => Number(n.trim())),
      grupos: [...m[2].matchAll(/group\.id === '([^']+)'/g)].map((x) => x[1]),
    }));

  // Condições de menu: avaliar as que conhecemos; as outras ficam "desconhecidas"
  function condicaoAtiva(condicao, role) {
    if (!condicao) return true;
    if (condicao.startsWith("canSeeSms")) return rolesSms ? rolesSms.includes(role) : null;
    const m = condicao.match(/role\s*===\s*(\d+)/);
    if (m) return Number(m[1]) === role;
    return null; // condição não interpretada → não verificável
  }

  function menuDoPerfil(role) {
    let grupos;
    let origem;
    if (accessTotalRole(role)) {
      grupos = gruposTodos;
      origem = `regra "if (role === ${role}) return all"`;
    } else {
      const filtro = regrasFiltro.find((r) => r.roles.includes(role));
      if (filtro) {
        grupos = gruposTodos.filter((g) => filtro.grupos.includes(g.id));
        origem = `regra "if ([${filtro.roles.join(", ")}].includes(role)) … filter(${filtro.grupos.join(", ")})"`;
      } else if (role === 0 && gruposSuperAdmin.length) {
        grupos = gruposSuperAdmin;
        origem = "bloco do Super Admin";
      } else {
        grupos = [];
        origem = "regra não reconhecida pela auditoria";
      }
    }
    const itens = [];
    for (const g of grupos) {
      for (const it of g.items) {
        const ativo = condicaoAtiva(it.condicao, role);
        if (ativo === false) continue;
        itens.push({ ...it, grupo: g.id, grupoLabel: g.label, condicional: ativo === null });
      }
    }
    return { grupos, itens, origem };
  }

  const accessTotalRole = (role) => acessoTotal.includes(role);

  return { gruposTodos, gruposSuperAdmin, regrasFiltro, acessoTotal, rolesSms, menuDoPerfil };
}

/** Rota inicial de cada perfil (stores/auth.js). */
function analisarDefaultRoute() {
  const src = readRepoFile("web-app-v2/src/stores/auth.js");
  if (!src) return null;
  const m = src.match(/if \(role === 3\) return ['"]([^'"]+)['"]/);
  return { gestor: m ? m[1] : null };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. BACKEND — rotas da API e guardas de perfil
// ════════════════════════════════════════════════════════════════════════════

const FICHEIROS_DE_ROTAS = [
  "src/routes.ts",
  "src/routes/cashRoutes.ts",
  "src/routes/bankAccountRoutes.ts",
  "src/routes/aiBotRoutes.ts",
];

const GUARDAS = ["isAdmin", "isStaff", "isSuperAdmin", "isPartner", "checkCashRegisterOpen"];

function analisarRotasAPI() {
  const rotas = [];

  // Sub-routers só contam se estiverem REALMENTE montados em src/routes.ts:
  // um ficheiro com `const aiBotRoutes = Router()` mas com o
  // `routes.use(aiBotRoutes)` comentado não expõe rota nenhuma.
  const raiz = readRepoFile("src/routes.ts") || "";
  const montados = new Set();
  for (const m of raiz.matchAll(/^\s*routes\.use\(([A-Za-z_$][\w$]*)\)/gm)) {
    montados.add(m[1]);
  }
  const desmontados = [];

  for (const rel of FICHEIROS_DE_ROTAS) {
    const src = readRepoFile(rel);
    if (!src) continue;
    const mVar = src.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*Router\(\)/);
    if (rel !== "src/routes.ts" && mVar && !montados.has(mVar[1])) {
      desmontados.push({ ficheiro: rel, router: mVar[1] });
      continue;
    }
    // Aceita também sub-routers (cashRoutes.post, bankAccountRoutes.get, …).
    const re = /[A-Za-z]*[Rr]outes\.(get|post|put|patch|delete)\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
      if (emComentario(src, m.index)) continue; // rota comentada (ex.: ai-bot desactivado)
      const abre = src.indexOf("(", m.index);
      const stmt = matchBalanced(src, abre);
      const mPath = stmt.match(/["']([^"']+)["']/);
      if (!mPath) continue;
      rotas.push({
        ficheiro: rel,
        metodo: m[1].toUpperCase(),
        caminho: mPath[1],
        linha: linhaDe(src, m.index),
        guardas: GUARDAS.filter((g) => new RegExp(`\\b${g}\\b`).test(stmt)),
        temAuth: /\bauth\b/.test(stmt),
      });
    }
  }
  const encontrar = (metodo, caminho) =>
    rotas.find((r) => r.metodo === metodo && r.caminho === caminho) || null;
  return { rotas, encontrar, desmontados, montados };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. ÁREAS DA TABELA §3.0 → ROTAS DO FRONTEND
//
// Mapa escrito à mão a partir das secções do próprio manual. Se a tabela do
// manual ganhar uma linha nova que não esteja aqui, a auditoria avisa em vez
// de aprovar em silêncio.
// ════════════════════════════════════════════════════════════════════════════

const AREA_PARA_ROTAS = {
  "Painel geral": ["/dashboard"],
  "Caixa do Dia / Caixa Central": ["/caixa", "/caixa-central"],
  "Contas Bancárias": ["/bank-accounts"],
  "Pagamentos": ["/pagamentos"],
  "Controle de Prestações": ["/admin/installments"],
  "Relatório Banco de Moçambique": ["/reports/banco-mocambique"],
  "Configurações da Empresa": ["/settings"],
  "Equipa e Parceiros": ["/equipe"],
  "Financiamento": ["/financiamento"],
  "Relatório de Financiadores": ["/reports/financiadores"],
  "Histórico / Auditoria": ["/logs"],
  "Mensagens": ["/sms/pendentes"],
  "Mutuários / Créditos / Microcrédito BM": ["/mutuarios", "/loans", "/admin/microcredito/dashboard"],
};

/**
 * Módulos que o manual descreve como UM ecrã com separadores internos.
 * As sub-páginas (/admin/microcredito/clientes, /creditos, …) vivem dentro
 * do módulo, por isso consideram-se cobertas quando o próprio módulo está
 * documentado (é o que o manual §2.0/§3.0 faz com «Painel Microcrédito BM»).
 */
const MODULOS_DOCUMENTADOS = ["/admin/microcredito"];

/** Áreas exclusivas do ADMIN cuja restrição também deve existir na API. */
const API_DAS_AREAS_EXCLUSIVAS = {
  "Financiamento": [
    { metodo: "POST", caminho: "/api/rate" },
    { metodo: "PUT", caminho: "/api/rate/:id" },
    { metodo: "DELETE", caminho: "/api/rate/:id" },
  ],
  "Equipa e Parceiros": [
    { metodo: "POST", caminho: "/api/users" },
    { metodo: "PUT", caminho: "/api/users/:id" },
    { metodo: "DELETE", caminho: "/api/users/:id" },
  ],
  "Histórico / Auditoria": [
    { metodo: "GET", caminho: "/api/logs/:id" },
    { metodo: "DELETE", caminho: "/api/logs" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// 6. EXECUÇÃO DAS VERIFICAÇÕES
// ════════════════════════════════════════════════════════════════════════════

function main() {
  const manual = analisarManual();
  const router = analisarRouter();
  const sidebar = analisarSidebar();
  const defaultRoute = analisarDefaultRoute();
  const api = analisarRotasAPI();

  // ── INTEGRIDADE DA PRÓPRIA AUDITORIA ─────────────────────────────────────
  check(
    "0. Integridade da auditoria",
    "O manual tem as secções 2.0 e 3.0 que a auditoria lê",
    manual.menuGestor.length > 0 && manual.areasAdmin.length > 0,
    `menus lidos: ${manual.menuGestor.length}; linhas na tabela §3.0: ${manual.areasAdmin.length}`,
  );
  check(
    "0. Integridade da auditoria",
    "O router do frontend foi interpretado",
    router.rotas.length > 10,
    `${router.rotas.length} rotas lidas`,
  );
  check(
    "0. Integridade da auditoria",
    "O menu lateral (AppSidebar) foi interpretado",
    sidebar.gruposTodos.length > 0 && sidebar.regrasFiltro.length > 0,
    `grupos: ${sidebar.gruposTodos.length}; regras de perfil reconhecidas: ${sidebar.regrasFiltro.length}` +
      (sidebar.regrasFiltro.length === 0 ? " → a estrutura do AppSidebar mudou: actualize este script" : ""),
  );
  check(
    "0. Integridade da auditoria",
    "As rotas da API foram interpretadas",
    api.rotas.length > 50,
    `${api.rotas.length} rotas de API lidas` +
      (api.desmontados.length
        ? `; sub-routers NÃO montados (ignorados de propósito): ${api.desmontados.map((d) => d.router).join(", ")}`
        : ""),
  );
  check(
    "0. Integridade da auditoria",
    "Todos os ficheiros de rotas da API estão montados",
    api.desmontados.every((d) => /aiBot/.test(d.router)),
    api.desmontados.length
      ? `desmontado(s): ${api.desmontados.map((d) => `${d.router} (${d.ficheiro})`).join(", ")} — se for intencional, o manual deve dizê-lo`
      : "todos montados",
  );

  // ── 1. MENU LATERAL DO GESTOR (§2.0 × AppSidebar) ────────────────────────
  const menu3 = sidebar.menuDoPerfil(3);
  const labels3 = menu3.itens.map((i) => i.label);

  for (const linha of manual.menuGestor) {
    const titulo = `Menu do Gestor: "${linha.item}" (grupo ${linha.grupo})`;
    const existeNoMenu = labels3.includes(linha.item);
    check(
      "1. Menu lateral do Gestor (manual §2.0)",
      titulo,
      existeNoMenu,
      existeNoMenu ? `presente no menu do perfil 3 — ${menu3.origem}` : `NÃO existe no menu do perfil 3 (menu real: ${labels3.join(", ")})`,
    );
    for (const rota of linha.rotas) {
      const existe = router.existe(rota);
      check(
        "1. Menu lateral do Gestor (manual §2.0)",
        `Destino citado existe no router: ${rota}`,
        existe,
        existe ? `allowedRoles: ${JSON.stringify(router.rolesDe(rota))}` : "rota inexistente no router do frontend",
      );
    }
  }

  for (const item of menu3.itens) {
    const documentado = manual.menuGestor.some((l) => l.item === item.label);
    check(
      "1. Menu lateral do Gestor (manual §2.0)",
      `Item do menu sem documentação: "${item.label}"`,
      documentado,
      documentado ? "" : `o perfil 3 tem este item no menu (${item.to}) mas o manual §2.0 não o descreve`,
      "aviso",
    );
  }

  // ── 2. TABELA §3.0 — PERMISSÕES POR PERFIL ───────────────────────────────
  for (const linha of manual.areasAdmin) {
    const celulaArea = (linha["Área"] || "").replace(/\*/g, "").trim();
    const areaLimpa = celulaArea.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const areaMapa = AREA_PARA_ROTAS[celulaArea] || AREA_PARA_ROTAS[areaLimpa];
    const area = celulaArea;
    const celulaGestor = (linha["Gestor"] || "").trim();
    const celulaAdmin = (linha["ADMIN"] || "").trim();

    let rotas = rotasDaCelula(linha["Área"] || "");
    if (rotas.length === 0 && areaMapa) rotas = areaMapa;

    if (rotas.length === 0) {
      check(
        "2. Permissões por perfil (manual §3.0)",
        `Área sem rotas mapeadas: "${area}"`,
        false,
        "linha nova na tabela §3.0 sem correspondência em AREA_PARA_ROTAS — acrescente o mapa neste script",
        "aviso",
      );
      continue;
    }

    // O manual marca o Gestor com ❌ (negado), ✅ (permitido) ou — (redirecciona)
    const gestorPermitido = /✅/.test(celulaGestor);
    const gestorNegado = /❌/.test(celulaGestor);
    const gestorRedirecciona = /^—|^-/.test(celulaGestor);
    const adminPermitido = /✅/.test(celulaAdmin);

    for (const rota of rotas) {
      const permiteGestor = router.permite(rota, 3);
      const permiteAdmin = router.permite(rota, 1);

      if (adminPermitido) {
        check(
          "2. Permissões por perfil (manual §3.0)",
          `ADMIN deve aceder a ${rota}`,
          permiteAdmin === true,
          `allowedRoles: ${JSON.stringify(router.rolesDe(rota))}`,
        );
      }

      if (gestorNegado) {
        check(
          "2. Permissões por perfil (manual §3.0)",
          `Gestor NÃO deve aceder a ${rota}`,
          permiteGestor === false,
          permiteGestor === false
            ? `bloqueado no router (allowedRoles ${JSON.stringify(router.rolesDe(rota))})`
            : `o manual diz ❌ mas o router permite o perfil 3 (allowedRoles ${JSON.stringify(router.rolesDe(rota))})`,
        );
      } else if (gestorRedirecciona) {
        const destino = defaultRoute && defaultRoute.gestor;
        check(
          "2. Permissões por perfil (manual §3.0)",
          `Gestor é redireccionado em ${rota}`,
          permiteGestor === false && destino === "/gestor",
          `allowedRoles ${JSON.stringify(router.rolesDe(rota))}; rota inicial do Gestor = ${destino}. ` +
            "O manual afirma que este ecrã redirecciona o Gestor para o Painel do Gestor.",
        );
      } else if (gestorPermitido) {
        const nota = /por URL/i.test(celulaGestor);
        if (nota) {
          const noMenu = menu3.itens.some((i) => i.to.split("?")[0] === rota);
          check(
            "2. Permissões por perfil (manual §3.0)",
            `Gestor acede a ${rota} apenas por URL (fora do menu)`,
            permiteGestor === true && !noMenu,
            `permitido no router: ${permiteGestor}; presente no menu do perfil 3: ${noMenu}`,
          );
        } else {
          check(
            "2. Permissões por perfil (manual §3.0)",
            `Gestor deve aceder a ${rota}`,
            permiteGestor === true,
            permiteGestor === true
              ? `allowedRoles ${JSON.stringify(router.rolesDe(rota))}`
              : `o manual diz ✅ mas o router não permite o perfil 3 (allowedRoles ${JSON.stringify(router.rolesDe(rota))})`,
          );
        }
      }
    }

    // A restrição do ADMIN existe também na API, ou só na interface?
    const apiExclusiva = API_DAS_AREAS_EXCLUSIVAS[celulaArea] || API_DAS_AREAS_EXCLUSIVAS[areaLimpa];
    if (gestorNegado && apiExclusiva) {
      for (const alvo of apiExclusiva) {
        const rota = api.encontrar(alvo.metodo, alvo.caminho);
        if (!rota) {
          check(
            "2. Permissões por perfil (manual §3.0)",
            `A API ${alvo.metodo} ${alvo.caminho} existe`,
            false,
            "o manual descreve esta área, mas a rota já não existe no backend",
          );
          continue;
        }
        const protegida = rota.guardas.length > 0;
        check(
          "2. Permissões por perfil (manual §3.0)",
          `API ${alvo.metodo} ${alvo.caminho} protegida por perfil`,
          protegida,
          `guarda de perfil no backend: ${protegida ? rota.guardas.join(", ") : "NENHUMA"} (ficheiro ${rota.ficheiro}:${rota.linha}). ` +
            "O ecrã está restrito ao ADMIN, mas a API aceita qualquer utilizador autenticado.",
          "aviso",
        );
      }
    }
  }

  // ── 3. ROTAS CITADAS NO MANUAL ───────────────────────────────────────────
  for (const rota of manual.rotasCitadas) {
    if (rota.startsWith("/api/")) continue; // verificação seguinte
    if (rota === "/") continue;
    const existe = router.existe(rota);
    check(
      "3. Rotas citadas no manual",
      `Rota do frontend citada no manual existe: ${rota}`,
      existe,
      existe ? `allowedRoles ${JSON.stringify(router.rolesDe(rota))}` : "caminho citado no manual não existe no router",
    );
  }

  for (const rota of manual.rotasCitadas.filter((r) => r.startsWith("/api/"))) {
    const registada = api.rotas.some((r) => r.caminho === rota || r.caminho.startsWith(rota));
    const comentada = /ai-bot/.test(rota);
    if (comentada) {
      check(
        "3. Rotas citadas no manual",
        `Manual diz que ${rota} está DESACTIVADO`,
        !registada,
        registada
          ? "a rota está registada no código: o manual precisa de ser actualizado"
          : "confirmado: a rota não é registada em src/routes.ts",
      );
    } else {
      check(
        "3. Rotas citadas no manual",
        `Rota de API citada no manual existe: ${rota}`,
        registada,
        registada ? "" : "caminho de API citado no manual não existe no backend",
      );
    }
  }

  // ── 4. COBERTURA: ROTAS DO FRONTEND NÃO DESCRITAS NO MANUAL ──────────────
  const FORA_DE_ESCOPO = new Set([
    "/", "/login", "/landing", "/registar-empresa", "/validar", "/portal-mutuario",
    "/company", "/configuracoes", "/settings", "/profile", "/notifications",
    "/parceiro", "/parceiro/dashboard", "/parceiro/creditos", "/parceiro/prestacoes-pagas",
    "/parceiro/prestacoes-pendentes", "/parceiro/mora", "/parceiro/recebimentos",
    "/parceiro/extrato", "/parceiro/recibos", "/portal", "/portal/creditos",
    "/portal/prestacoes", "/portal/pagamentos", "/portal/perfil", "/:pathMatch(.*)*",
    "/carteiras-financiamento", "/parceiros-financiadores",
  ]);
  const textoManual = manual.texto;
  for (const rota of router.rotas) {
    if (FORA_DE_ESCOPO.has(rota.path)) continue;
    // Rotas de detalhe (/loans/:id) estão cobertas quando o ecrã de lista
    // (/loans) está documentado.
    const parametrizada = /[:*]/.test(rota.path);
    const base = rota.path.split("/:")[0].split("/*")[0];
    const documentadas = [
      ...Object.keys(router.porCaminho),
      ...manual.menuGestor.flatMap((l) => l.rotas),
      ...Object.values(AREA_PARA_ROTAS).flat(),
    ];
    // Uma rota cobre-se a si própria, pelo prefixo já documentado
    // (/admin/microcredito/<secção> sob o módulo) ou pelo ecrã de lista
    // no caso das rotas de detalhe (/loans/:id sob /loans).
    const cobertaPorPrefixo = documentadas.some(
      (p) => p !== rota.path && (
        rota.path.startsWith(p + "/") ||
        p.startsWith(rota.path + "/") ||
        (parametrizada && p.startsWith(base))
      ),
    ) || MODULOS_DOCUMENTADOS.some((mod) => rota.path === mod || rota.path.startsWith(mod + "/"));
    const citada = textoManual.includes(rota.path) ||
      documentadas.includes(rota.path) ||
      cobertaPorPrefixo ||
      (parametrizada && (textoManual.includes(base) ||
        Object.values(AREA_PARA_ROTAS).some((lista) => lista.includes(base))));
    check(
      "4. Cobertura do manual",
      `Rota do sistema fora do manual: ${rota.path}`,
      citada,
      citada
        ? (cobertaPorPrefixo ? "coberta pelo módulo/lista documentado no manual" : "")
        : `a rota ${rota.path} existe (allowedRoles ${JSON.stringify(rota.allowedRoles)}) mas não é descrita no manual; ` +
          "se está fora do âmbito dos dois perfis, acrescente-a a FORA_DE_ESCOPO neste script",
      "aviso",
    );
  }

  // ── 5. AFIRMAÇÕES "[Em desenvolvimento]" ─────────────────────────────────
  const docs = (rel) => readRepoFile(rel) || "";
  const gestorPage = docs("web-app-v2/src/pages/GestorPage.vue");
  const logsPage = docs("web-app-v2/src/pages/LogsPage.vue");
  const notifPage = docs("web-app-v2/src/pages/NotificationsPage.vue");
  const rolesSection = docs("web-app-v2/src/components/settings/RolesSection.vue");
  const microCtrl = docs("src/controllers/MicrocreditController.ts");
  const certificacao = docs("src/config/certificacao.ts");
  const routesTs = docs("src/routes.ts");

  const afirmacoes = [
    {
      nome: "SMS/WhatsApp na grelha de prestações do Painel do Gestor",
      aindaPendente: /Em desenvolvimento/.test(gestorPage) && /sendSMS|sendWhatsApp/.test(gestorPage),
      evidencia: "GestorPage.vue: sendSMS/sendWhatsApp notificam «Em desenvolvimento»",
    },
    {
      nome: "Exportação do Histórico (Logs)",
      aindaPendente: /Exporta[çc][ãa]o em desenvolvimento/i.test(logsPage),
      evidencia: "LogsPage.vue: exportLogs() mostra «Exportação em desenvolvimento»",
    },
    {
      nome: "Página de Notificações por implementar",
      aindaPendente: /em constru[çc][ãa]o/i.test(notifPage),
      evidencia: "NotificationsPage.vue: mostra «Página em construção»",
    },
    {
      nome: "Permissões guardadas apenas no navegador (sem efeito no servidor)",
      aindaPendente:
        /localStorage\.setItem\(\s*['"]rolePermissions['"]/.test(rolesSection) &&
        !/api\.(post|put|patch)\s*\(/.test(rolesSection),
      evidencia: "RolesSection.vue: grava em localStorage e não chama nenhuma API de permissões",
    },
    {
      nome: "Escrita do módulo Microcrédito desactivada (410)",
      aindaPendente: /legacyWriteDisabled/.test(microCtrl) && /status\(410\)/.test(microCtrl),
      evidencia: "MicrocreditController.ts: responde 410 nas escritas do módulo isolado",
    },
    {
      nome: "Selo AT não impresso no recibo (AT_CERTIFICADO_ENABLED por defeito = false)",
      aindaPendente: /AT_CERTIFICADO_ENABLED\s*\?\?\s*["']false["']/.test(certificacao),
      evidencia: "config/certificacao.ts: valor por omissão «false»",
    },
    {
      nome: "Configuração avançada de mora sem ecrã (carência/tecto/limite de dias)",
      aindaPendente: !/grace_days|cap_percent|max_late_days|company_penalty_rules/.test(docs("web-app-v2/src/pages/SettingsPage.vue")),
      evidencia: "SettingsPage.vue: não expõe as regras avançadas de mora (só a Multa % na secção Empresa)",
    },
    {
      nome: "Módulo de IA (ai-bot) desactivado",
      aindaPendente: /\/\/\s*routes\.use\(aiBotRoutes\)/.test(routesTs) && !/^\s*routes\.use\(aiBotRoutes\)/m.test(routesTs),
      evidencia: "routes.ts: a rota do ai-bot está comentada",
    },
  ];

  for (const a of afirmacoes) {
    check(
      '5. Afirmações "[Em desenvolvimento]" (manual §5)',
      `Continua em desenvolvimento: ${a.nome}`,
      a.aindaPendente,
      a.aindaPendente
        ? a.evidencia
        : "o código já não mostra o estado inacabado: remova a marca [Em desenvolvimento] do manual",
    );
  }

  // O manual não pode afirmar "em desenvolvimento" fora destas situações conhecidas
  const marcadoresNoManual = manual.marcasDesenvolvimento.length;
  check(
    '5. Afirmações "[Em desenvolvimento]" (manual §5)',
    `Marcas [Em desenvolvimento] no manual: ${marcadoresNoManual}; estados inacabados confirmados no código: ${afirmacoes.length}`,
    marcadoresNoManual > 0,
    "As verbas acima mostram que os estados inacabados continuam inacabados. Uma diferença entre estes dois " +
      "números pode significar que uma situação deixou de estar marcada no manual (ou que uma situação nova " +
      "apareceu no código) — vale a pena conferir.",
  );

  // ── 6. REGRA CENTRAL DO MANUAL: CAIXA DO DIA ─────────────────────────────
  const abrirCaixa = api.encontrar("POST", "/api/cash-registers/open");
  const caixaUI = router.rolesDe("/caixa");
  if (abrirCaixa) {
    check(
      "6. Regra do caixa (manual §2.7.8 / §3.2)",
      "Abrir caixa está restrito ao ADMIN apenas na interface",
      caixaUI !== undefined && !caixaUI.includes(3),
      `UI /caixa → allowedRoles ${JSON.stringify(caixaUI)}; API POST /api/cash-registers/open → guardas ` +
        `${JSON.stringify(abrirCaixa.guardas)} (só exige sessão válida). ` +
        "O manual deve continuar a dizer que o ecrã está reservado ao ADMIN.",
      "aviso",
    );
  }
  const desembolso = api.encontrar("POST", "/api/createInstallmentsLoan/");
  if (desembolso) {
    check(
      "6. Regra do caixa (manual §2.7.8 / §3.2)",
      "O desembolso continua a exigir caixa do dia aberto",
      desembolso.guardas.includes("checkCashRegisterOpen"),
      `guardas da rota: ${desembolso.guardas.join(", ") || "nenhuma"}`,
    );
  }
  const pagamento = api.encontrar("POST", "/api/tranzaction");
  if (pagamento) {
    check(
      "6. Regra do caixa (manual §2.7.8 / §3.2)",
      "O registo de pagamento continua a exigir caixa do dia aberto",
      pagamento.guardas.includes("checkCashRegisterOpen"),
      `guardas da rota: ${pagamento.guardas.join(", ") || "nenhuma"}`,
    );
  }

  // ── RELATÓRIO ────────────────────────────────────────────────────────────
  if (AS_JSON) {
    console.log(JSON.stringify({
      manual: MANUAL,
      linhas: manual.linhas,
      resumo: {
        verificacoes: results.length,
        conformes: results.filter((r) => r.ok).length,
        divergencias: DIVERGENCIAS.length,
        avisos: AVISOS.length,
        naoVerificavel: NAO_VERIFICAVEL.length,
      },
      divergencias: DIVERGENCIAS,
      avisos: AVISOS,
      naoVerificavel: NAO_VERIFICAVEL,
    }, null, 2));
  } else {
    imprimirRelatorio(manual);
  }

  return DIVERGENCIAS.length === 0 ? 0 : 1;
}

function imprimirRelatorio(manual) {
  const largura = 74;
  const titulo = "AUDITORIA MANUAL × CÓDIGO — FreeBuff Microcrédito";
  console.log("=".repeat(largura));
  console.log(titulo);
  console.log("=".repeat(largura));
  console.log(`Manual   : ${MANUAL} (${manual.linhas} linhas)`);
  console.log(`Verificado em: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`);
  console.log("");

  const seccoes = [...new Set(results.map((r) => r.seccao))];
  for (const seccao of seccoes) {
    const itens = results.filter((r) => r.seccao === seccao);
    const falhas = itens.filter((r) => !r.ok);
    if (QUIET && falhas.length === 0) continue;
    console.log(`── ${seccao}`);
    for (const r of itens) {
      const marca = r.ok ? "✔" : r.severidade === "erro" ? "✖" : "⚠";
      console.log(`  ${marca} ${r.titulo}`);
      if (!r.ok && r.detalhe) console.log(`      → ${r.detalhe}`);
      else if (r.ok && r.detalhe && !QUIET) console.log(`      ${r.detalhe}`);
    }
    console.log("");
  }

  const conformes = results.filter((r) => r.ok).length;
  console.log("=".repeat(largura));
  console.log("RESUMO");
  console.log(`  Verificações ....... ${results.length}`);
  console.log(`  Conformes .......... ${conformes}`);
  console.log(`  DIVERGÊNCIAS ....... ${DIVERGENCIAS.length}   (manual desactualizado)`);
  console.log(`  Avisos ............. ${AVISOS.length}   (código menos restrito do que a UI)`);
  console.log(`  Não verificável .... ${NAO_VERIFICAVEL.length}`);
  console.log("=".repeat(largura));
  if (DIVERGENCIAS.length > 0) {
    console.log("Actualize o manual ou o código nas divergências acima (✖).");
  } else {
    console.log("O manual continua fiel ao código.");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 7. AUTO-TESTE (--self-test)
//
// Uma auditoria que nunca falha não serve para nada. Este modo estraga o
// manual de propósito (num ficheiro temporário, nunca no repositório) e exige
// que a auditoria DETECTE cada estrago. Se deixar de detectar, o auto-teste
// falha e o problema aparece antes de alguém confiar no relatório verde.
// ════════════════════════════════════════════════════════════════════════════

function correrAuditoria(caminhoManual) {
  const { execFileSync } = require("child_process");
  try {
    const out = execFileSync(process.execPath, [__filename, "--quiet", `--manual=${caminhoManual}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { codigo: 0, texto: out };
  } catch (e) {
    return {
      codigo: typeof e.status === "number" ? e.status : -1,
      texto: `${e.stdout || ""}${e.stderr || ""}`,
    };
  }
}

function autoTeste() {
  const os = require("os");
  const base = readRepoFile(MANUAL_POR_OMISSAO);
  console.log("AUTO-TESTE DA AUDITORIA — o manual é estragado de propósito (em ficheiro temporário)");
  console.log("=".repeat(74));
  if (!base) {
    console.error("FALHOU: manual base não encontrado (" + MANUAL_POR_OMISSAO + ")");
    return 1;
  }

  const mutacoes = [
    {
      nome: "item de menu inventado + ecrã que não existe",
      ancora: "| **Geral** | Painel |",
      inserir: "| **Geral** | Ecrã Inventado | Ecrã de teste (`/ecra-inventado`) |\n",
      esperado: 'Menu do Gestor: "Ecrã Inventado"',
    },
    {
      nome: "permissão invertida (manual diz que o Gestor não vê Mutuários)",
      de: "| Mutuários / Créditos / Microcrédito BM | ✅ | ✅ |",
      para: "| Mutuários / Créditos / Microcrédito BM | ❌ | ✅ |",
      esperado: "o manual diz ❌ mas o router permite o perfil 3",
    },
  ];

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-manual-selftest-"));
  let falhas = 0;

  try {
    // 0) O manual real tem de passar (senão o resto do teste não diz nada).
    const limpo = correrAuditoria(MANUAL_POR_OMISSAO);
    const limpoOk = limpo.codigo === 0;
    console.log(`${limpoOk ? "✔" : "✖"} Manual actual sem mutações → código de saída ${limpo.codigo} (esperado 0)`);
    if (!limpoOk) {
      falhas++;
      console.log(limpo.texto.split("\n").filter((l) => l.includes("✖")).join("\n"));
    }

    // 1) Cada mutação tem de ser detectada.
    for (const mut of mutacoes) {
      let texto = base;
      if (mut.de) {
        const ocorrencias = texto.split(mut.de).length - 1;
        if (ocorrencias === 0) {
          console.log(`✖ Mutação "${mut.nome}": âncora não existe no manual — actualize este auto-teste.`);
          falhas++;
          continue;
        }
        texto = texto.split(mut.de).join(mut.para);
      }
      if (mut.ancora) {
        const ocorrencias = texto.split(mut.ancora).length - 1;
        if (ocorrencias !== 1) {
          console.log(`✖ Mutação "${mut.nome}": âncora ambígua (${ocorrencias}× no manual) — actualize este auto-teste.`);
          falhas++;
          continue;
        }
        texto = texto.replace(mut.ancora, mut.inserir + mut.ancora);
      }
      const ficheiro = path.join(dir, `mutacao-${falhas + 1}.md`);
      fs.writeFileSync(ficheiro, texto, "utf8");
      const r = correrAuditoria(ficheiro);
      const detectou = r.codigo === 1 && r.texto.includes(mut.esperado);
      console.log(`${detectou ? "✔" : "✖"} Mutação detectada: ${mut.nome} → saída ${r.codigo} (esperado 1)`);
      if (!detectou) {
        falhas++;
        console.log(`    esperado encontrar: ${mut.esperado}`);
        console.log(r.texto.split("\n").slice(-12).join("\n"));
      }
    }
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temporário */ }
  }

  console.log("=".repeat(74));
  if (falhas === 0) {
    console.log("AUTO-TESTE PASSOU — a auditoria detecta divergências e aprova o manual actual.");
    return 0;
  }
  console.log(`AUTO-TESTE FALHOU — ${falhas} problema(s). A auditoria não é de confiança.`);
  return 1;
}

process.exit(SELF_TEST ? autoTeste() : main());
