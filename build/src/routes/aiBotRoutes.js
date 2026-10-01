"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiBotRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const aiBotController_1 = require("../modules/aiBot/aiBotController");
/**
 * ROTAS DO AI BOT MAISMOLA (Fase 2 do MAISMOLA_BOT_AUDIT.md)
 *
 *  POST /api/ai-bot/query  → pergunta em pt-MZ; respondida por Groq (tool-calling)
 *                            com tools READ-ONLY. auth valida o JWT; companyId e
 *                            userId são resolvidos dentro do controller.
 */
const aiBotRoutes = (0, express_1.Router)();
exports.aiBotRoutes = aiBotRoutes;
aiBotRoutes.post("/api/ai-bot/query", auth_1.auth, aiBotController_1.queryBot);
