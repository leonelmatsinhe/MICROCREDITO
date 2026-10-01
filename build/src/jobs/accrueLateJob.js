"use strict";
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
exports.startLateAccrualJob = void 0;
const lateInterestService_1 = require("../services/lateInterestService");
/**
 * JOB DE ACCRUAL DIÁRIO DE MORA — lateInterestService.runLateAccrualJob.
 *
 * Corre todos os dias na janela 00:00–00:59 (alvo 00:05). O tick é horário:
 * se o servidor estiver desligado à meia-noite, faz catch-up na primeira
 * hora em que ligar (uma execução por dia, garantida pela data).
 *
 * Idempotência: a tabela late_accruals tem UNIQUE(amortization_loan_id,
 * accrual_date) e o job usa INSERT IGNORE — correr 2× no mesmo dia não
 * duplica mora.
 */
// Data de hoje no fuso do servidor (YYYY-MM-DD).
const todayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
// Hora local HH:MM.
const nowHHMM = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};
let lastRunDate = "";
const tick = () => __awaiter(void 0, void 0, void 0, function* () {
    const today = todayKey();
    if (lastRunDate === today)
        return; // já correu hoje
    const hhmm = nowHHMM();
    // Janela normal (00:00–00:59) OU catch-up fora da janela (servidor ligou
    // tarde) — em ambos os casos corre 1×/dia, pois o job é idempotente.
    const inWindow = hhmm >= "00:00" && hhmm <= "00:59";
    if (!inWindow && lastRunDate !== "" && lastRunDate !== today) {
        // fora da janela mas ainda não correu hoje → catch-up permitido
    }
    else if (!inWindow) {
        return;
    }
    try {
        const result = yield (0, lateInterestService_1.runLateAccrualJob)();
        lastRunDate = today;
        console.log(`[LateAccrualJob] mora diária: ${result.created} criado(s), ${result.skipped} ignorado(s), ${result.errors} erro(s) em ${result.processed} prestação(ões).`);
    }
    catch (error) {
        console.error("[LateAccrualJob] Falha no accrual de mora:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
/** Arranca o timer horário do accrual. Devolve o timer para shutdown limpo. */
const startLateAccrualJob = () => {
    // 1.ª execução suave no arranque (catch-up se o servidor esteve off à meia-noite)
    setTimeout(() => { tick().catch(() => { }); }, 15000);
    return setInterval(() => { tick().catch(() => { }); }, 60 * 60 * 1000);
};
exports.startLateAccrualJob = startLateAccrualJob;
