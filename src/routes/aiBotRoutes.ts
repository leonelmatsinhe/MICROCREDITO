import { Router } from "express";
import { auth } from "../middlewares/auth";
import { queryBot } from "../modules/aiBot/aiBotController";

/**
 * ROTAS DO AI BOT MAISMOLA (Fase 2 do MAISMOLA_BOT_AUDIT.md)
 *
 *  POST /api/ai-bot/query  → pergunta em pt-MZ; respondida por Groq (tool-calling)
 *                            com tools READ-ONLY. auth valida o JWT; companyId e
 *                            userId são resolvidos dentro do controller.
 */
const aiBotRoutes = Router();

aiBotRoutes.post("/api/ai-bot/query", auth, queryBot);

export { aiBotRoutes };
