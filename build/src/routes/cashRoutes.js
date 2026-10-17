"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../middlewares/roles");
const checkCashRegisterOpen_1 = require("../middlewares/checkCashRegisterOpen");
const CashRegisterController_1 = require("../controllers/CashRegisterController");
/**
 * ROTAS DO CAIXA DIÁRIO — todas protegidas por autenticação (auth).
 *
 * LEITURAS DO CAIXA (GET) são EXCLUSIVAS DO ADMIN (`isCompanyAdmin`): o
 * Gestor de Crédito não visualiza funcionalidades financeiras — caixa,
 * histórico de caixa nem caixa central (o frontend também esconde o menu).
 *
 *  GET  /api/cash-registers/today            → estado do caixa de hoje
 *  POST /api/cash-registers/open             → abrir caixa (exige opening_balance)
 *  POST /api/cash-registers/:id/close        → fechar caixa (exige valor contado)
 *  GET  /api/cash-registers/:id              → detalhe do caixa
 *  GET  /api/cash-registers/:id/movements    → movimentos do caixa
 *  POST /api/cash-registers/:id/movements    → movimento manual (CASH ou BANK)
 *  GET  /api/cash-registers/history          → histórico de caixas (auditoria)
 *  GET  /api/cash-registers/daily-summary    → resumo consolidado do dia
 *
 * Conformidade com a contabilidade moçambicana (Mapa de Caixa — Modelo BM):
 *  → o fecho exige a CONTAGEM POR DENOMINAÇÃO e nunca devolve o saldo apurado;
 *  → diferença != 0 cria um auto de ocorrência DIFERENCA_CAIXA pendente:
 *  GET  /api/cash-registers/differences          → quebras/sobras (Admin)
 *  POST /api/cash-registers/differences/:id/observacao → observação do OPERADOR no auto
 *  POST /api/cash-registers/differences/:id/justify → justificar e lançar na conta 58x (Admin)
 *  → o limite de numerário em caixa (CASH_LIMIT_MZN, omissão 75.000 MT) obriga a
 *    ENTREGA_COFRE ou DEPOSITO_BANCARIO antes de o operador continuar a operar.
 */
const cashRoutes = (0, express_1.Router)();
exports.cashRoutes = cashRoutes;
// ── MODO DE CAIXA DA EMPRESA ──
// PHYSICAL = caixa de numerário (fluxo anterior, inalterado);
// ELECTRONIC = reconciliação manual por conta bancária JÁ EXISTENTE (accounts),
// sem exigir caixa aberto para desembolsar ou receber.
//  GET /api/cash-register/mode
//  PUT /api/cash-register/mode                 (Admin)
//  GET /api/cash-register/electronic/today     (Admin)
//  POST /api/cash-register/electronic/open-day (Admin)
//  POST /api/cash-register/electronic/reconcile(Admin)
cashRoutes.get("/api/cash-register/mode", auth_1.auth, CashRegisterController_1.getCashMode);
cashRoutes.put("/api/cash-register/mode", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.updateCashMode);
cashRoutes.get("/api/cash-register/electronic/today", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getElectronicToday);
// Reconciliação bancária do dia POR CONTA (saldo inicial, movimentos, teórico,
// real e diferença) — dados que alimentam o PDF do relatório.
cashRoutes.get("/api/cash-register/electronic/report", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getElectronicReport);
cashRoutes.post("/api/cash-register/electronic/open-day", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.openElectronicDayHandler);
cashRoutes.post("/api/cash-register/electronic/reconcile", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.reconcileElectronicHandler);
cashRoutes.get("/api/cash-registers/today", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getToday);
// RECONCILIAÇÃO DO DIA — 3 fontes: tranzactions vs caixa vs recibos. ANTES de "/:id".
cashRoutes.get("/api/cash-registers/reconciliation", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getReconciliation);
// DIFERENÇAS DE CAIXA (quebras/sobras) — auto de ocorrência do fecho, para o
// Admin justificar e lançar no Livro Caixa (conta 58x). ANTES de "/:id".
// PAINEL DE TESOURARIA (Admin): excedentes do limite de numerário em caixa e
// diferenças pendentes por operador. ANTES de "/:id".
cashRoutes.get("/api/cash-registers/treasury-panel", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getTreasuryPanelView);
cashRoutes.get("/api/cash-registers/differences", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getDifferences);
// Observação/justificação do OPERADOR no auto de ocorrência — modal
// "Auto de Ocorrência - Diferença de Caixa" logo após o fecho cego. Não exige
// Admin: o próprio operador do caixa documenta a quebra/sobra.
cashRoutes.post("/api/cash-registers/differences/:id/observacao", auth_1.auth, CashRegisterController_1.observeDifference);
cashRoutes.post("/api/cash-registers/differences/:id/justify", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.justifyDifference);
// COMPROVATIVO DE ENTREGA DE VALORES AO COFRE CENTRAL — PDF próprio (A4) com
// selo electrónico (hash SHA-256) e QR de validação pública.
cashRoutes.get("/api/cash-movements/:movementId/comprovativo", auth_1.auth, CashRegisterController_1.getComprovativoEntrega);
cashRoutes.get("/api/cash-deliveries/validate", CashRegisterController_1.validateComprovativoEntrega);
cashRoutes.get("/api/cash-registers/history", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getHistory);
cashRoutes.get("/api/cash-registers/daily-summary", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getDailySummary);
// Caixa do Sistema (portal fora de expediente) — card do Caixa Central.
cashRoutes.get("/api/cash-registers/system-register", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getSystemRegister);
// Alerta do sino: pagamentos do portal fora de expediente ainda não vistos
// (chegados após o último fecho de caixa presencial da empresa).
cashRoutes.get("/api/cash-registers/portal-alert", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getPortalAlert);
cashRoutes.post("/api/cash-registers/open", auth_1.auth, CashRegisterController_1.openToday);
// Sugestão de saldo inicial — INVALIDADA (o caixa abre sempre com saldo zero
// disponível; o endpoint devolve 0 e mantém-se só por compatibilidade).
// Tem de estar ANTES de "/:id" para não ser capturada.
cashRoutes.get("/api/cash-registers/opening-balance-suggestion", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getOpeningBalanceSuggestion);
cashRoutes.get("/api/cash-registers/:id", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.findOne);
cashRoutes.get("/api/cash-registers/:id/movements", auth_1.auth, roles_1.isCompanyAdmin, CashRegisterController_1.getMovements);
// Movimento manual: só faz sentido num caixa ABERTO de hoje — o service
// devolve REGISTER_CLOSED / REGISTER_NOT_TODAY caso contrário.
cashRoutes.post("/api/cash-registers/:id/movements", auth_1.auth, CashRegisterController_1.createManualMovement);
// Fecho também exige caixa aberto; o service valida posse e estado.
cashRoutes.post("/api/cash-registers/:id/close", auth_1.auth, checkCashRegisterOpen_1.checkCashRegisterOpen, CashRegisterController_1.close);
