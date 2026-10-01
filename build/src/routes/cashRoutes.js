"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const checkCashRegisterOpen_1 = require("../middlewares/checkCashRegisterOpen");
const CashRegisterController_1 = require("../controllers/CashRegisterController");
/**
 * ROTAS DO CAIXA DIÁRIO — todas protegidas por autenticação (auth).
 *
 *  GET  /api/cash-registers/today            → estado do caixa de hoje
 *  POST /api/cash-registers/open             → abrir caixa (exige opening_balance)
 *  POST /api/cash-registers/:id/close        → fechar caixa (exige valor contado)
 *  GET  /api/cash-registers/:id              → detalhe do caixa
 *  GET  /api/cash-registers/:id/movements    → movimentos do caixa
 *  POST /api/cash-registers/:id/movements    → movimento manual (CASH ou BANK)
 *  GET  /api/cash-registers/history          → histórico de caixas (auditoria)
 *  GET  /api/cash-registers/daily-summary    → resumo consolidado do dia
 */
const cashRoutes = (0, express_1.Router)();
exports.cashRoutes = cashRoutes;
cashRoutes.get("/api/cash-registers/today", auth_1.auth, CashRegisterController_1.getToday);
// RECONCILIAÇÃO DO DIA — 3 fontes: tranzactions vs caixa vs recibos. ANTES de "/:id".
cashRoutes.get("/api/cash-registers/reconciliation", auth_1.auth, CashRegisterController_1.getReconciliation);
cashRoutes.get("/api/cash-registers/history", auth_1.auth, CashRegisterController_1.getHistory);
cashRoutes.get("/api/cash-registers/daily-summary", auth_1.auth, CashRegisterController_1.getDailySummary);
// Caixa do Sistema (portal fora de expediente) — card do Caixa Central.
cashRoutes.get("/api/cash-registers/system-register", auth_1.auth, CashRegisterController_1.getSystemRegister);
// Alerta do sino: pagamentos do portal fora de expediente ainda não vistos
// (chegados após o último fecho de caixa presencial da empresa).
cashRoutes.get("/api/cash-registers/portal-alert", auth_1.auth, CashRegisterController_1.getPortalAlert);
cashRoutes.post("/api/cash-registers/open", auth_1.auth, CashRegisterController_1.openToday);
// Sugestão de saldo inicial (valor contado no fecho anterior) — pré-preenche
// o dialog de abertura. Tem de estar ANTES de "/:id" para não ser capturada.
cashRoutes.get("/api/cash-registers/opening-balance-suggestion", auth_1.auth, CashRegisterController_1.getOpeningBalanceSuggestion);
cashRoutes.get("/api/cash-registers/:id", auth_1.auth, CashRegisterController_1.findOne);
cashRoutes.get("/api/cash-registers/:id/movements", auth_1.auth, CashRegisterController_1.getMovements);
// Movimento manual: só faz sentido num caixa ABERTO de hoje — o service
// devolve REGISTER_CLOSED / REGISTER_NOT_TODAY caso contrário.
cashRoutes.post("/api/cash-registers/:id/movements", auth_1.auth, CashRegisterController_1.createManualMovement);
// Fecho também exige caixa aberto; o service valida posse e estado.
cashRoutes.post("/api/cash-registers/:id/close", auth_1.auth, checkCashRegisterOpen_1.checkCashRegisterOpen, CashRegisterController_1.close);
