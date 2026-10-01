"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPaymentJobs = void 0;
const accrueLateJob_1 = require("./accrueLateJob");
/**
 * ARRANQUE DOS JOBS DO MÓDULO DE PAGAMENTOS V2.
 * Chamado no bootstrap do app.ts. Devolve os timers criados para shutdown
 * limpo (clearInterval em.SIGTERM, se aplicável).
 */
const startPaymentJobs = () => {
    const timers = [];
    try {
        timers.push((0, accrueLateJob_1.startLateAccrualJob)());
        console.log("[Jobs] Late accrual de mora agendado (janela 00:05, catch-up horário)");
    }
    catch (error) {
        console.error("[Jobs] Falha ao agendar accrual de mora:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    return timers;
};
exports.startPaymentJobs = startPaymentJobs;
