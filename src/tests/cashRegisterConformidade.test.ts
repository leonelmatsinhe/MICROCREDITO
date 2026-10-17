import "../config/env"; // carrega .env ANTES de qualquer conexão (DATABASE_* etc.)
import express from "express";
import bodyParser from "body-parser";
import * as jwt from "jsonwebtoken";
import { Server } from "http";
import { db } from "../database/db";
import { tenantGuard } from "../middlewares/tenantGuard";
import { routes } from "../routes";
import { runMigrations } from "../migrations";

/**
 * TESTES DE INTEGRAÇÃO — CAIXA / CONFORMIDADE CONTABILIDADE MOÇAMBICANA
 *
 * Runner próprio (o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/cashRegisterConformidade.test.ts
 *   (ou: npm run test:cash)
 *
 * Sobe as ROTAS REAIS por HTTP (mesma ordem de middlewares do src/app.ts) numa
 * empresa/utilizadores temporários (criados e apagados no fim) e verifica:
 *
 *  1. Abertura com contagem por denominação (o total é calculado no backend);
 *  2. Tipos OFICIAIS de tesouraria: ENTREGA_COFRE, REFORCO_CAIXA,
 *     DEPOSITO_BANCARIO e DIFERENCA_CAIXA no ENUM de cash_movements;
 *  3. LIMITE DE NUMERÁRIO EM CAIXA (circular do BM, 75.000 MT por omissão):
 *     entrada de dinheiro que excede é recusada (409) e obriga a ENTREGA_COFRE
 *     ou DEPOSITO_BANCARIO antes de continuar a operar;
 *  4. Fecho com contagem CEGA: a resposta NUNCA traz closing_balance_calculated;
 *  5. Diferença != 0 → auto de ocorrência DIFERENCA_CAIXA + pendência
 *     (cash_differences) para o Admin justificar e lançar na conta 58x;
 *  6. Mapa de Caixa — Modelo BM: Saldo Inicial, Entradas, Saídas, Entregas ao
 *     Cofre e Saldo Final, com o saldo final igual ao numerário contado;
 *  7. Só o Admin justifica diferenças; tipo_fechamento ENTREGA_COFRE exige o
 *     movimento de entrega registado.
 */

// ── Mini-runner ─────────────────────────────────────────────────────────────
const failures: string[] = [];
let passed = 0;

const check = (cond: boolean, message: string) => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
};

const checkEqual = (actual: any, expected: any, message: string) =>
  check(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)})`
  );

const round2 = (value: number) => Math.round(value * 100) / 100;

// ── Infra de teste ──────────────────────────────────────────────────────────
let app: { port: number; close: () => Promise<void> } | null = null;
let companyId = 0;
let adminId = 0;
let gestorId = 0;
let adminToken = "";
let gestorToken = "";

const call = async (
  path: string,
  init: { method?: string; body?: any; token?: string } = {}
): Promise<{ status: number; body: any; raw: string }> => {
  const response = await fetch(`http://127.0.0.1:${app!.port}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${init.token || adminToken}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const raw = await response.text();
  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw: raw.slice(0, 200) };
  }
  return { status: response.status, body, raw };
};

const setupDatabase = async () => {
  // Empresa e utilizadores temporários — o teste NUNCA toca nos caixas reais.
  // NOTA: em MySQL o sequelize.query(INSERT) devolve [insertId, affectedRows].
  const [companyInsertId] = await db.query(
    `INSERT INTO companies
       (companyName, companyEmail, companyWebsite, companyManager, companyNuit, companyPhone,
        districtId, provinceId, forfeit, companyAddress, companyStatus, cash_register_mode,
        createdAt, updatedAt)
     VALUES (?, ?, '', 'Teste Conformidade', '000000000', '840000000',
        155, 1, 0, 'Teste', 1, 'PHYSICAL', NOW(), NOW())`,
    // cash_register_mode: esta suite valida o CAIXA DE NUMERÁRIO, que só existe
    // em modo PHYSICAL (em ELECTRONIC a abertura/fecho são recusados — ver [9]).
    { replacements: ["TESTE CAIXA BM (apagar)", "teste.caixa@local.invalid"] }
  );
  companyId = Number(companyInsertId);
  if (!companyId) throw new Error("Não foi possível criar a empresa de teste.");

  const insertUser = async (name: string, email: string, role: number): Promise<number> => {
    const [userId] = await db.query(
      `INSERT INTO users
         (name, email, password, updatedPassword, phone, companyId, status, userRole, createdAt, updatedAt)
       VALUES (?, ?, 'x', 0, '840000001', ?, 1, ?, NOW(), NOW())`,
      { replacements: [name, email, companyId, role] }
    );
    return Number(userId);
  };

  adminId = await insertUser("TESTE Admin Caixa", `teste.admin.${Date.now()}@local.invalid`, 1);
  gestorId = await insertUser("TESTE Gestor Caixa", `teste.gestor.${Date.now()}@local.invalid`, 3);

  adminToken = jwt.sign({ id: adminId, companyId }, process.env.APP_SECRET + "");
  gestorToken = jwt.sign({ id: gestorId, companyId }, process.env.APP_SECRET + "");
};

const cleanupDatabase = async () => {
  if (!companyId) return;
  const safe = async (sql: string, replacements: any[]) => {
    try {
      await db.query(sql, { replacements });
    } catch (error: any) {
      console.warn(`[cleanup] ${error?.message || error}`);
    }
  };
  await safe("DELETE FROM cash_movements WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM cash_differences WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM cash_registers WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM user_logs WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM users WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM companies WHERE id = ?", [companyId]);
  console.log(`  · dados de teste limpos (empresa ${companyId})`);
};

const startApp = async () => {
  const server: Server = await new Promise((resolve) => {
    const instance = express();
    instance.use(tenantGuard);
    instance.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
    instance.use(bodyParser.json({ limit: "10mb" }));
    instance.use(routes);
    const s = instance.listen(0, () => resolve(s));
  });
  const address: any = server.address();
  return {
    port: Number(address.port),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

const openRegister = async (token: string, denominations: Record<string, number>) => {
  const response = await call("/api/cash-registers/open", {
    method: "POST",
    body: { denominations },
    token,
  });
  return response;
};

const addMovement = async (
  registerId: number,
  body: { type: string; category: string; amount: number; description: string },
  token?: string
) =>
  call(`/api/cash-registers/${registerId}/movements`, {
    method: "POST",
    body,
    token,
  });

// ── Testes ──────────────────────────────────────────────────────────────────
const main = async () => {
  // O guard de tenant tem de estar inerte (modo multi) para a empresa de teste
  delete process.env.TENANT_MODE;
  // Limite de numerário em caixa — o valor da circular do BM.
  process.env.CASH_LIMIT_MZN = "75000";

  // Schema actualizado ANTES de tudo: as migrações correm no arranque do
  // servidor real (bootstrap do app.ts) e este teste monta o seu próprio
  // express — sem isto, um schema antigo reprovaria checks de colunas novas.
  await runMigrations();

  await setupDatabase();
  app = await startApp();

  console.log(`\nEmpresa de teste: ${companyId} · Admin ${adminId} · Gestor ${gestorId}`);

  // ── 0. Schema: os tipos oficiais existem no ENUM -------------------------
  console.log("\n[0] Schema — tipos oficiais de tesouraria");
  const [categoryColumn]: any = await db.query(
    "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cash_movements' AND COLUMN_NAME = 'category'"
  );
  const columnType = String(categoryColumn[0]?.COLUMN_TYPE || "");
  for (const tipo of ["ENTREGA_COFRE", "REFORCO_CAIXA", "DEPOSITO_BANCARIO", "DIFERENCA_CAIXA"]) {
    check(columnType.includes(tipo), `cash_movements.category aceita ${tipo}`);
  }
  const [registerColumns]: any = await db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cash_registers'"
  );
  const registerColumnNames = (registerColumns as any[]).map((c) => c.COLUMN_NAME);
  for (const coluna of ["denominations_open", "denominations_close", "tipo_fechamento"]) {
    check(registerColumnNames.includes(coluna), `cash_registers.${coluna} existe`);
  }
  const [differenceTables]: any = await db.query("SHOW TABLES LIKE 'cash_differences'");
  check((differenceTables as any[]).length === 1, "tabela cash_differences existe");
  const [differenceColumns]: any = await db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cash_differences'"
  );
  const differenceColumnNames = (differenceColumns as any[]).map((c) => c.COLUMN_NAME);
  for (const coluna of ["observacao_operador", "justificacao", "status"]) {
    check(differenceColumnNames.includes(coluna), `cash_differences.${coluna} existe`);
  }

  // ── 1. Abertura com contagem por denominação ─────────────────────────────
  console.log("\n[1] Abertura do caixa com contagem por denominação");
  const opened = await openRegister(adminToken, { "1000": 1, "500": 2, "100": 1 });
  checkEqual(opened.status, 201, "POST /open responde 201");
  const registerId = Number(opened.body?.result?.id) || 0;
  check(registerId > 0, `caixa criado (#${registerId})`);
  checkEqual(opened.body?.result?.opening_balance, 0, "saldo inicial ZERO — o caixa abre sem saldo disponível (valor invalidado)");
  checkEqual(
    opened.body?.result?.counted_open,
    2100,
    "fundo de maneio contado guardado como memorando (1000 + 500×2 + 100) — não é saldo"
  );
  checkEqual(
    opened.body?.result?.denominations_open,
    { "1000": 1, "500": 2, "200": 0, "100": 1, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0, "0.5": 0 },
    "denominations_open gravado (grelha completa contada)"
  );
  check(
    !("closing_balance_calculated" in (opened.body?.result || {})),
    "resposta sem closing_balance_calculated"
  );
  checkEqual(opened.body?.result?.limites?.cash_limit_mzn, 75000, "limite de numerário exposto (75.000 MZN)");
  checkEqual(opened.body?.result?.limites?.excedido, false, "caixa dentro do limite na abertura");

  // O arrasto de saldo foi invalidado: a sugestão de saldo inicial morreu.
  const sugestao = await call("/api/cash-registers/opening-balance-suggestion");
  checkEqual(sugestao.status, 200, "GET /opening-balance-suggestion responde 200");
  checkEqual(sugestao.body?.result?.suggested, 0, "sugestão de saldo inicial invalidada — sempre 0 (sem arrasto)");
  checkEqual(sugestao.body?.result?.source, "saldo-zero", "origem saldo-zero (o valor arrastado saiu do rasto)");

  // ── 2. Limite de numerário em caixa (circular do BM) ────────────────────
  console.log("\n[2] Limite de numerário em caixa (75.000 MZN)");
  const entradaGrande = await addMovement(registerId, {
    type: "ENTRADA",
    category: "OUTROS",
    amount: 70000,
    description: "Entrada de teste dentro do limite",
  });
  checkEqual(entradaGrande.status, 201, "entrada de 70.000 MZN aceite (fundo 2.100 + 70.000 = 72.100 em gaveta)");

  const excedeu = await addMovement(registerId, {
    type: "ENTRADA",
    category: "OUTROS",
    amount: 3000,
    description: "Entrada que excede o limite de numerário",
  });
  checkEqual(excedeu.status, 409, "entrada que excede o limite é recusada (409)");
  checkEqual(excedeu.body?.error, "CASH_LIMIT_EXCEEDED", "código CASH_LIMIT_EXCEEDED");
  check(
    String(excedeu.body?.message || "").includes("ENTREGA_COFRE") &&
      String(excedeu.body?.message || "").includes("DEPOSITO_BANCARIO"),
    "mensagem obriga a ENTREGA_COFRE ou DEPOSITO_BANCARIO"
  );
  checkEqual(excedeu.body?.excedente, 100, "excedente calculado (100 MZN acima do limite)");

  const todayAfterBlock = await call("/api/cash-registers/today");
  checkEqual(
    round2(
      Number(todayAfterBlock.body?.result?.register?.counted_open ?? todayAfterBlock.body?.result?.register?.opening_balance) +
        Number(todayAfterBlock.body?.result?.register?.total_cash_in) -
        Number(todayAfterBlock.body?.result?.register?.total_cash_out)
    ),
    72100,
    "movimento recusado não alterou o dinheiro em gaveta (fundo 2.100 + 70.000)"
  );
  checkEqual(
    todayAfterBlock.body?.result?.cashLimit?.excedido,
    false,
    "gaveta continua dentro do limite"
  );

  // ── 3. Tipos oficiais de tesouraria ─────────────────────────────────────
  console.log("\n[3] Movimentos dos tipos oficiais");
  const entregaCofre = await addMovement(registerId, {
    type: "SAIDA",
    category: "ENTREGA_COFRE",
    amount: 40000,
    description: "Entrega do excedente ao Cofre Central — comprovativo assinado",
  });
  checkEqual(entregaCofre.status, 201, "ENTREGA_COFRE registada (entrega ao Cofre/Tesoureiro)");

  const depositoBancario = await addMovement(registerId, {
    type: "SAIDA",
    category: "DEPOSITO_BANCARIO",
    amount: 1000,
    description: "Guia de depósito do excedente no banco (BCI)",
  });
  checkEqual(depositoBancario.status, 201, "DEPOSITO_BANCARIO registado (guia de depósito)");

  const reforco = await addMovement(registerId, {
    type: "ENTRADA",
    category: "REFORCO_CAIXA",
    amount: 500,
    description: "Requisição de fundo de maneio do Cofre para o guichê",
  });
  checkEqual(reforco.status, 201, "REFORCO_CAIXA registado (fundo de maneio do Cofre)");

  const diferencaManual = await addMovement(registerId, {
    type: "SAIDA",
    category: "DIFERENCA_CAIXA",
    amount: 10,
    description: "Tentativa de lançar diferença à mão",
  });
  checkEqual(diferencaManual.status, 400, "DIFERENCA_CAIXA não pode ser lançada manualmente (auto de ocorrência)");

  // ── 4. Fecho com contagem CEGA + auto de ocorrência ─────────────────────
  // Gaveta física: fundo 2.100 + 70.000 − 40.000 − 1.000 + 500 = 31.600 MZN
  // (o fundo de maneio é memorando — o saldo inicial é 0, mas o dinheiro está
  // mesmo na gaveta e é isso que o operador conta).
  // O operador conta 31.500 (20×1000 + 20×500 + 15×100) → quebra de 100 MZN.
  console.log("\n[4] Fecho por contagem cega (quebra de 100 MZN)");
  const closed = await call(`/api/cash-registers/${registerId}/close`, {
    method: "POST",
    body: {
      denominations: { "1000": 20, "500": 20, "100": 15 },
      tipo_fechamento: "NORMAL",
      notes: "Contagem do operador no fecho",
    },
  });
  checkEqual(closed.status, 200, "POST /close responde 200");
  const closedRegister = closed.body?.result || {};
  checkEqual(closedRegister.closing_balance_informed, 31500, "valor contado calculado das denominações");
  checkEqual(closedRegister.difference, -100, "diferença apurada (−100 = quebra)");
  check(!closed.raw.includes("closing_balance_calculated"), "resposta do fecho NÃO traz closing_balance_calculated");
  checkEqual(closedRegister.tipo_fechamento, "DIVERGENCIA", "tipo_fechamento = DIVERGENCIA (auto de ocorrência)");
  checkEqual(
    closedRegister.denominations_close,
    { "1000": 20, "500": 20, "200": 0, "100": 15, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0, "0.5": 0 },
    "denominations_close gravado no fecho (grelha completa contada)"
  );
  checkEqual(closedRegister.diferenca_pendente?.tipo, "QUEBRA", "pendência criada como QUEBRA");
  checkEqual(closedRegister.diferenca_pendente?.valor, 100, "pendência com o valor da diferença");
  checkEqual(closedRegister.diferenca_pendente?.status, "PENDENTE", "pendência PENDENTE (por justificar pelo Admin)");
  checkEqual(
    closedRegister.diferenca_pendente?.conta_contabilistica,
    "58",
    "conta contabilística 58x — Quebras de Caixa"
  );

  // ── 5. Mapa de Caixa — Modelo BM ────────────────────────────────────────
  console.log("\n[5] Mapa de Caixa — Modelo BM");
  const mapa = closedRegister.mapa_bm || {};
  checkEqual(mapa.titulo, "Mapa de Caixa - Modelo BM", 'cabeçalho "Mapa de Caixa - Modelo BM"');
  checkEqual(mapa.saldo_inicial, 2100, "Mapa BM — Saldo Inicial");
  checkEqual(mapa.entradas, 70500, "Mapa BM — Entradas (70.000 + 500 cash)");
  checkEqual(mapa.saidas, 0, "Mapa BM — Saídas operacionais (entregas em linha própria)");
  checkEqual(mapa.entregas_cofre, 40000, "Mapa BM — Entregas ao Cofre");
  checkEqual(mapa.depositos_bancarios, 1000, "Mapa BM — Depósitos bancários");
  checkEqual(mapa.quebras, 100, "Mapa BM — Quebras de caixa do dia");
  checkEqual(mapa.saldo_final, 31500, "Mapa BM — Saldo Final = numerário contado");
  checkEqual(mapa.valor_contado, 31500, "Mapa BM — valor contado pelo operador");
  checkEqual(mapa.diferenca, -100, "Mapa BM — diferença apurada");
  // Só os TEXTOS VISÍVEIS contam (os nomes de campo internos, como
  // `tipo_fechamento`, não são impressos no documento).
  const mapaTextos = Object.values(mapa)
    .filter((value) => typeof value === "string")
    .join(" | ");
  checkEqual(mapa.tipo_fechamento_label, "Fecho com divergência — auto de ocorrência (conta 58)", "rótulo do fecho em PT-MZ");
  check(
    !/fechamento|usuário|usuários|sangria|suprimento|conferência|cheque|cédula/i.test(mapaTextos),
    `Mapa BM sem termos brasileiros nos textos ("${mapaTextos}")`
  );

  const today = await call("/api/cash-registers/today");
  check(
    !today.raw.includes("closing_balance_calculated"),
    "GET /today também não devolve o saldo apurado ao frontend"
  );
  checkEqual(today.body?.result?.register?.mapa_bm?.saldo_final, 31500, "GET /today expõe o Mapa BM");

  // ── 6. Diferenças: só o Admin justifica e lança na conta 58 ─────────────
  console.log("\n[6] Diferenças de caixa — justificação pelo Admin");
  const diferencasPendentes = await call("/api/cash-registers/differences?status=PENDENTE");
  checkEqual(diferencasPendentes.status, 200, "GET /differences (Admin) responde 200");
  checkEqual(
    (diferencasPendentes.body?.result || []).length,
    1,
    "1 diferença pendente listada"
  );
  const diferencaId = Number(diferencasPendentes.body?.result?.[0]?.id) || 0;
  checkEqual(diferencasPendentes.body?.summary?.valor_pendente, 100, "resumo: 100 MZN pendentes");
  checkEqual(
    diferencasPendentes.body?.summary?.conta_contabilistica,
    "58 — Quebras de Caixa",
    "resumo indica a conta 58 — Quebras de Caixa"
  );

  // ── Painel de tesouraria (Admin): por operador ──
  const painel = await call("/api/cash-registers/treasury-panel");
  checkEqual(painel.status, 200, "GET /treasury-panel (Admin) responde 200");
  checkEqual(painel.body?.result?.limite?.cash_limit_mzn, 75000, "painel expõe o limite de numerário");
  checkEqual(painel.body?.result?.summary?.total_diferencas_pendentes, 1, "painel: 1 diferença pendente");
  const porOperador = painel.body?.result?.diferencas_por_operador || [];
  checkEqual(porOperador.length, 1, "diferenças agrupadas por operador (1 operador)");
  checkEqual(porOperador[0]?.total_pendentes, 1, "operador com 1 pendência");
  checkEqual(porOperador[0]?.valor_pendente, 100, "operador com 100 MZN pendentes");
  checkEqual(porOperador[0]?.quebras, 1, "1 quebra registada para o operador");
  check(Array.isArray(painel.body?.result?.excedentes), "painel devolve a lista de excedentes (array)");
  const gestorPainel = await call("/api/cash-registers/treasury-panel", { token: gestorToken });
  checkEqual(gestorPainel.status, 403, "Gestor de crédito NÃO acede ao painel de tesouraria (403)");

  const gestorLeitura = await call("/api/cash-registers/differences", { token: gestorToken });
  checkEqual(gestorLeitura.status, 403, "Gestor de crédito NÃO pode listar/justificar diferenças (403)");
  const gestorJustifica = await call(`/api/cash-registers/differences/${diferencaId}/justify`, {
    method: "POST",
    body: { justificacao: "Tentativa sem permissão." },
    token: gestorToken,
  });
  checkEqual(gestorJustifica.status, 403, "Gestor de crédito NÃO pode justificar (403)");

  // Leituras do caixa são exclusivas do Admin no backend (não só no menu).
  const gestorToday = await call("/api/cash-registers/today", { token: gestorToken });
  checkEqual(gestorToday.status, 403, "Gestor de crédito NÃO acede ao caixa de hoje (403)");
  const gestorHistorico = await call("/api/cash-registers/history", { token: gestorToken });
  checkEqual(gestorHistorico.status, 403, "Gestor de crédito NÃO acede ao histórico de caixa (403)");
  const gestorSugestao = await call("/api/cash-registers/opening-balance-suggestion", { token: gestorToken });
  checkEqual(gestorSugestao.status, 403, "Gestor de crédito NÃO acede à sugestão de saldo (403)");

  // ── Observação / Justificação do OPERADOR no auto de ocorrência ──
  // (modal "Auto de Ocorrência - Diferença de Caixa" logo após o fecho cego).
  const obsCurta = await call(`/api/cash-registers/differences/${diferencaId}/observacao`, {
    method: "POST",
    body: { observacao: "curta" },
  });
  checkEqual(obsCurta.status, 400, "observação do operador demasiado curta é recusada (400)");
  checkEqual(obsCurta.body?.error, "INVALID_OBSERVATION", "código INVALID_OBSERVATION");

  const obsNaoResponsavel = await call(`/api/cash-registers/differences/${diferencaId}/observacao`, {
    method: "POST",
    body: { observacao: "Tentativa de outro utilizador sem responsabilidade sobre o caixa." },
    token: gestorToken,
  });
  checkEqual(obsNaoResponsavel.status, 403, "quem não é responsável pelo caixa não documenta o auto (403)");

  const obsTexto =
    "Na contagem cega do fecho faltaram 100 MZN na gaveta; não há movimento por registar.";
  const obsOperador = await call(`/api/cash-registers/differences/${diferencaId}/observacao`, {
    method: "POST",
    body: { observacao: obsTexto },
  });
  checkEqual(obsOperador.status, 200, "operador regista a Observação / Justificação (200)");
  checkEqual(
    obsOperador.body?.result?.observacao_operador,
    obsTexto,
    "observação guardada no auto de ocorrência"
  );
  checkEqual(obsOperador.body?.result?.status, "PENDENTE", "auto continua PENDENTE (só o Admin lança)");

  const justificacaoCurta = await call(`/api/cash-registers/differences/${diferencaId}/justify`, {
    method: "POST",
    body: { justificacao: "curta" },
  });
  checkEqual(justificacaoCurta.status, 400, "justificação demasiado curta é recusada (400)");

  const justificada = await call(`/api/cash-registers/differences/${diferencaId}/justify`, {
    method: "POST",
    body: {
      justificacao:
        "Quebra de 100 MZN confirmada na contagem do fecho pelo operador; lançada na conta 58 — Quebras de Caixa.",
    },
  });
  checkEqual(justificada.status, 200, "Admin justifica a diferença (200)");
  checkEqual(justificada.body?.result?.status, "JUSTIFICADA", "pendência passa a JUSTIFICADA");
  checkEqual(justificada.body?.result?.justifiedBy, adminId, "registo de quem justificou");
  check(
    !!justificada.body?.result?.justifiedAt,
    "registo da data/hora da justificação"
  );
  checkEqual(
    justificada.body?.result?.observacao_operador,
    obsTexto,
    "a observação do operador permanece no auto depois do lançamento"
  );

  const obsDepoisDoLancamento = await call(`/api/cash-registers/differences/${diferencaId}/observacao`, {
    method: "POST",
    body: { observacao: "Tentativa de alterar o auto depois de lançado no Livro Caixa." },
  });
  checkEqual(obsDepoisDoLancamento.status, 409, "observação recusada depois de JUSTIFICADA (409)");

  const pendentesDepois = await call("/api/cash-registers/differences?status=PENDENTE");
  checkEqual((pendentesDepois.body?.result || []).length, 0, "já não há diferenças pendentes");
  const justificadas = await call("/api/cash-registers/differences?status=JUSTIFICADA");
  checkEqual((justificadas.body?.result || []).length, 1, "a diferença aparece como JUSTIFICADA");

  // ── 7. Fecho com entrega ao Cofre exige o movimento de entrega ──────────
  console.log("\n[7] Fecho com entrega ao Cofre (tipo_fechamento)");
  const aberturaGestor = await openRegister(gestorToken, { "500": 2 });
  checkEqual(aberturaGestor.status, 201, "caixa do gestor aberto com 1.000 MZN");
  const gestorRegisterId = Number(aberturaGestor.body?.result?.id) || 0;

  // Contagem igual ao apurado (1.000) mas SEM movimento de entrega registado:
  // o fecho com entrega ao Cofre tem de ser recusado.
  const fechoSemEntrega = await call(`/api/cash-registers/${gestorRegisterId}/close`, {
    method: "POST",
    body: { denominations: { "500": 2 }, tipo_fechamento: "ENTREGA_COFRE" },
    token: gestorToken,
  });
  checkEqual(fechoSemEntrega.status, 409, "fecho com entrega ao Cofre SEM movimento de entrega é recusado (409)");
  checkEqual(fechoSemEntrega.body?.error, "DELIVERY_REQUIRED", "código DELIVERY_REQUIRED");

  const entregaGestor = await addMovement(
    gestorRegisterId,
    {
      type: "SAIDA",
      category: "ENTREGA_COFRE",
      amount: 1000,
      description: "Entrega do fundo ao Cofre Central — comprovativo assinado",
    },
    gestorToken
  );
  checkEqual(entregaGestor.status, 201, "ENTREGA_COFRE registada pelo gestor");

  // ── Comprovativo de Entrega de Valores ao Cofre Central (PDF + QR) ──
  const entregaMovId = Number(entregaGestor.body?.result?.id) || 0;
  check(entregaMovId > 0, "movimento ENTREGA_COFRE identificado");

  const comprovativo = await fetch(
    `http://127.0.0.1:${app.port}/api/cash-movements/${entregaMovId}/comprovativo`,
    { headers: { Authorization: `Bearer ${gestorToken}` } }
  );
  const compBytes = Buffer.from(await comprovativo.arrayBuffer());
  checkEqual(comprovativo.status, 200, "GET /comprovativo responde 200");
  check(
    String(comprovativo.headers.get("content-type") || "").includes("application/pdf"),
    "comprovativo é application/pdf"
  );
  check(
    compBytes.length > 1000 && compBytes.subarray(0, 5).toString() === "%PDF-",
    `comprovativo PDF válido (${compBytes.length} bytes)`
  );
  const compHash = String(comprovativo.headers.get("x-comprovativo-hash") || "");
  const compNumero = String(comprovativo.headers.get("x-comprovativo-numero") || "");
  check(compHash.length === 64, "hash SHA-256 exposto no cabeçalho do PDF");
  check(/^CE-\d{4}-\d+$/.test(compNumero), `número do comprovativo (${compNumero})`);

  // Validação pública do QR (sem token): hash correcto → válido.
  const valido = await fetch(
    `http://127.0.0.1:${app.port}/api/cash-deliveries/validate?numero=${encodeURIComponent(compNumero)}&hash=${encodeURIComponent(compHash)}`
  );
  const validoBody = await valido.json();
  checkEqual(valido.status, 200, "GET /cash-deliveries/validate responde 200 (público)");
  checkEqual(validoBody.result?.valid, true, "comprovativo válido com o hash correcto");

  const adulterado = await fetch(
    `http://127.0.0.1:${app.port}/api/cash-deliveries/validate?numero=${encodeURIComponent(compNumero)}&hash=${"0".repeat(64)}`
  );
  const adulteradoBody = await adulterado.json();
  checkEqual(adulteradoBody.result?.valid, false, "hash adulterado → comprovativo inválido");

  const semHash = await fetch(
    `http://127.0.0.1:${app.port}/api/cash-deliveries/validate?numero=${encodeURIComponent(compNumero)}`
  );
  checkEqual(semHash.status, 400, "validação sem hash é recusada (400)");

  // A gaveta foi integralmente entregue ao Cofre: a contagem no fecho é ZERO
  // (o operador conta a gaveta vazia) e a diferença tem de ser 0.
  const fechoComEntrega = await call(`/api/cash-registers/${gestorRegisterId}/close`, {
    method: "POST",
    body: { denominations: { "500": 0 }, tipo_fechamento: "ENTREGA_COFRE" },
    token: gestorToken,
  });
  checkEqual(fechoComEntrega.status, 200, "fecho com entrega ao Cofre aceite");
  checkEqual(fechoComEntrega.body?.result?.tipo_fechamento, "ENTREGA_COFRE", "tipo_fechamento gravado");
  checkEqual(fechoComEntrega.body?.result?.difference, 0, "sem divergência (contagem igual ao apurado)");
  checkEqual(
    fechoComEntrega.body?.result?.diferenca_pendente,
    null,
    "sem diferença NÃO cria pendência"
  );
  checkEqual(
    fechoComEntrega.body?.result?.mapa_bm?.entregas_cofre,
    1000,
    "Mapa BM do gestor: entrega ao Cofre de 1.000 MZN"
  );
  checkEqual(fechoComEntrega.body?.result?.mapa_bm?.saldo_final, 0, "Mapa BM: saldo final 0 (fundo entregue)");

  // ── 8. PDF do Mapa de Caixa (endpoint usado pelo frontend) ─────────────
  console.log("\n[8] PDF — endpoint do relatório tabelar (backend)");
  const pdfResponse = await fetch(`http://127.0.0.1:${app.port}/api/reports/table-pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: mapa.titulo,
      filename: `mapa-caixa-${mapa.data}`,
      columns: [{ label: "Mapa de Caixa — Modelo BM", width: 260 }, { label: "Valor (MZN)", align: "right" }],
      rows: [
        ["Saldo Inicial", "2 100,00"],
        ["Entradas", "70 500,00"],
        ["Saídas", "0,00"],
        ["Entregas ao Cofre", "40 000,00"],
        ["Saldo Final", "31 500,00"],
      ],
    }),
  });
  const pdfBytes = Buffer.from(await pdfResponse.arrayBuffer());
  checkEqual(pdfResponse.status, 200, "POST /api/reports/table-pdf responde 200");
  check(
    String(pdfResponse.headers.get("content-type") || "").includes("application/pdf"),
    "resposta é application/pdf"
  );
  check(
    pdfBytes.length > 1000 && pdfBytes.subarray(0, 5).toString() === "%PDF-",
    `PDF válido gerado (${pdfBytes.length} bytes)`
  );
  const pdfText = pdfBytes.toString("latin1");
  const tituloNoPdf = /Mapa de Caixa/.test(pdfText);
  console.log(
    tituloNoPdf
      ? "  · o título do Mapa de Caixa aparece no texto do PDF"
      : "  · PDF com streams comprimidos: o título não é legível nos bytes (verificado no código do frontend)"
  );

  // ── 9. MODO ELECTRÓNICO: caixa de numerário bloqueado ──────────────────
  console.log("\n[9] Modo ELECTRÓNICO — abertura/fecho do caixa físico bloqueados");
  await db.query("UPDATE companies SET cash_register_mode = 'ELECTRONIC' WHERE id = ?", {
    replacements: [companyId],
  });

  const modoElectronico = await call("/api/cash-register/mode");
  checkEqual(modoElectronico.body?.result?.mode, "ELECTRONIC", "modo da empresa passa a ELECTRONIC");

  const aberturaBloqueada = await openRegister(adminToken, { "100": 1 });
  checkEqual(aberturaBloqueada.status, 400, "abertura de caixa físico recusada (400)");
  checkEqual(aberturaBloqueada.body?.error, "INVALID_MODE", "abertura falha com INVALID_MODE");
  check(
    String(aberturaBloqueada.body?.message || "").includes("Configurações"),
    "mensagem da abertura explica onde voltar ao modo FÍSICO (Configurações → Caixa)"
  );

  const fechoBloqueado = await call(`/api/cash-registers/${gestorRegisterId}/close`, {
    method: "POST",
    body: { denominations: { "100": 1 } },
  });
  checkEqual(fechoBloqueado.status, 400, "fecho de caixa físico recusado (400)");
  checkEqual(fechoBloqueado.body?.error, "INVALID_MODE", "fecho falha com INVALID_MODE");
  check(
    String(fechoBloqueado.body?.message || "").includes("Configurações"),
    "mensagem do fecho explica onde voltar ao modo FÍSICO (Configurações → Caixa)"
  );

  // Relatório do dia por conta (dados do PDF) — continua disponível em ELECTRONIC
  const hoje = new Date().toISOString().slice(0, 10);
  const relatorio = await call(`/api/cash-register/electronic/report?date=${hoje}`);
  checkEqual(relatorio.status, 200, "relatório de reconciliação bancária responde 200");
  check(
    Array.isArray(relatorio.body?.result?.accounts) && !!relatorio.body?.result?.totals,
    "relatório devolve contas + totais do dia"
  );

  // Restaurar PHYSICAL para a empresa temporária terminar como começou.
  await db.query("UPDATE companies SET cash_register_mode = 'PHYSICAL' WHERE id = ?", {
    replacements: [companyId],
  });
  const modoFisico = await call("/api/cash-register/mode");
  checkEqual(modoFisico.body?.result?.mode, "PHYSICAL", "modo restaurado para PHYSICAL");
};

/**
 * Fecho do teste: fecha o servidor, LIMPA os dados de teste e só depois decide
 * o código de saída — a limpeza nunca pode ser saltada por uma falha.
 */
const finish = async () => {
  try {
    if (app) await app.close();
  } catch (error: any) {
    console.warn(`[cleanup] servidor: ${error?.message || error}`);
  }
  await cleanupDatabase();

  console.log(`\n${passed} verificação(ões) passaram, ${failures.length} falharam.`);
  if (failures.length > 0) {
    failures.forEach((f) => console.error(`  ✗ ${f}`));
    process.exit(1);
  }
  console.log("CAIXA / CONFORMIDADE BM OK");
  process.exit(0);
};

main()
  .then(finish)
  .catch(async (error: any) => {
    console.error("Falha inesperada nos testes:", error?.stack || error);
    failures.push(String(error?.message || error));
    await finish();
  });
