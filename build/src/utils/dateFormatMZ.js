"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateTimeMZ = exports.formatDateMZ = void 0;
const moment_1 = __importDefault(require("moment"));
/**
 * FORMATO DE DATA DE MOÇAMBIQUE (DD/MM/AAAA) — helper central
 * -----------------------------------------------------------
 * Regra do sistema: NENHUMA mensagem (SMS/WhatsApp), recibo, extracto ou
 * contrato imprime datas cruas de JavaScript ("Sun Nov 01 2026 00:00:00
 * GMT+0000 (Coordinated Universal Time)") nem toISOString(). Toda a data
 * mostrada ao mutuário passa por aqui.
 *
 * Fuso: África/Maputo (UTC+2, sem horário de verão). O fuso NUNCA aparece
 * no texto final — quem imprime usa só o retorno "01/11/2026".
 *
 * Cuidado com o fuso do servidor (pode ser UTC na VPS): uma Date de
 * vencimento "2026-11-01" chega como meia-noite UTC; formatar em UTC
 * dava 31/10. Aqui interpretamos sempre o relógio de parede de Maputo,
 * e strings "YYYY-MM-DD" (DATEONLY do Sequelize) são lidas sem fuso,
 * dígito a dígito — resultado idêntico em qualquer servidor.
 */
const MAPUTO_UTC_OFFSET_MIN = 120;
/** DD/MM/AAAA — datas de vencimento, desembolso, emissão, etc. */
const formatDateMZ = (value) => {
    if (value === null || value === undefined || value === "")
        return "";
    const raw = value instanceof Date ? null : String(value).trim();
    if (raw) {
        // "2026-11-01", "2026-11-01 00:00:00", ISO curto — data de calendário.
        const calendar = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
        if (calendar)
            return `${calendar[3]}/${calendar[2]}/${calendar[1]}`;
    }
    const parsed = (0, moment_1.default)(value).utcOffset(MAPUTO_UTC_OFFSET_MIN);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "";
};
exports.formatDateMZ = formatDateMZ;
/** DD/MM/AAAA HH:mm — momentos (envio de SMS, emissão de recibo). */
const formatDateTimeMZ = (value) => {
    if (value === null || value === undefined || value === "")
        return "";
    const raw = value instanceof Date ? null : String(value).trim();
    if (raw) {
        const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
        if (calendar)
            return `${calendar[3]}/${calendar[2]}/${calendar[1]} 00:00`;
    }
    const parsed = (0, moment_1.default)(value).utcOffset(MAPUTO_UTC_OFFSET_MIN);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : "";
};
exports.formatDateTimeMZ = formatDateTimeMZ;
