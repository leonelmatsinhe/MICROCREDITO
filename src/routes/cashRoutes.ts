import { Router, Request, Response } from "express";
import { auth } from "../middlewares/auth";
import { checkCashRegisterOpen } from "../middlewares/checkCashRegisterOpen";
import {
  getToday,
  openToday,
  close,
  findOne,
  getMovements,
  createManualMovement,
  getHistory,
  getDailySummary,
  getSystemRegister,
  getPortalAlert,
  getOpeningBalanceSuggestion,
} from "../controllers/CashRegisterController";

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
const cashRoutes = Router();

cashRoutes.get("/api/cash-registers/today", auth, getToday);
cashRoutes.get("/api/cash-registers/history", auth, getHistory);
cashRoutes.get("/api/cash-registers/daily-summary", auth, getDailySummary);
// Caixa do Sistema (portal fora de expediente) — card do Caixa Central.
cashRoutes.get("/api/cash-registers/system-register", auth, getSystemRegister);
// Alerta do sino: pagamentos do portal fora de expediente ainda não vistos
// (chegados após o último fecho de caixa presencial da empresa).
cashRoutes.get("/api/cash-registers/portal-alert", auth, getPortalAlert);
cashRoutes.post("/api/cash-registers/open", auth, openToday);
// Sugestão de saldo inicial (valor contado no fecho anterior) — pré-preenche
// o dialog de abertura. Tem de estar ANTES de "/:id" para não ser capturada.
cashRoutes.get("/api/cash-registers/opening-balance-suggestion", auth, getOpeningBalanceSuggestion);
cashRoutes.get("/api/cash-registers/:id", auth, findOne);
cashRoutes.get("/api/cash-registers/:id/movements", auth, getMovements);

// Movimento manual: só faz sentido num caixa ABERTO de hoje — o service
// devolve REGISTER_CLOSED / REGISTER_NOT_TODAY caso contrário.
cashRoutes.post("/api/cash-registers/:id/movements", auth, createManualMovement);

// Fecho também exige caixa aberto; o service valida posse e estado.
cashRoutes.post("/api/cash-registers/:id/close", auth, checkCashRegisterOpen, close);

export { cashRoutes };
