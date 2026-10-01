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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReciboMigrationJob = void 0;
const ReciboModel_1 = require("../database/models/ReciboModel");
const reciboService_1 = require("../services/reciboService");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
/**
 * JOB DE MIGRAÇÃO DE RECIBOS ANTIGOS
 * ---------------------------------------------------------------------------
 * Recibos emitidos antes do recibo backend-authoritative (gerados no browser
 * com pdfMake) não têm pdf_path — ou o ficheiro já não existe. O endpoint
 * GET /api/recibos/:id/pdf já regenera on-the-fly a pedido; este job cobre
 * TODOS os recibos antigos em background, uma única vez por arranque.
 *
 * Idempotente: só toca em recibos sem pdf_url ou cujo ficheiro em disco
 * desapareceu. Recibos novos (emitidos dentro da transaction do pagamento)
 * já nascem com pdf_url e nunca são reprocessados.
 */
const BATCH_SIZE = 25;
const pdfFileMissing = (pdfUrl) => {
    if (!pdfUrl)
        return true;
    const abs = path_1.default.join(process.cwd(), "uploads", "docs", path_1.default.basename(String(pdfUrl)));
    return !fs_1.default.existsSync(abs);
};
const regenerateOldReceipts = () => __awaiter(void 0, void 0, void 0, function* () {
    const candidatos = (yield ReciboModel_1.ReciboModel.findAll({
        where: { pdf_url: null },
        limit: BATCH_SIZE,
        order: [["id", "ASC"]],
        raw: true,
    }));
    // Recibos com pdf_url gravado mas ficheiro apagado (ex.: limpeza de uploads).
    if (candidatos.length === 0) {
        const comUrl = (yield ReciboModel_1.ReciboModel.findAll({
            where: { pdf_url: { [sequelize_1.Op.ne]: null } },
            attributes: ["id", "pdf_url"],
            limit: 500,
            order: [["id", "DESC"]],
            raw: true,
        }));
        for (const recibo of comUrl) {
            if (pdfFileMissing(recibo.pdf_url))
                candidatos.push(recibo);
        }
    }
    if (candidatos.length === 0) {
        console.log("[ReciboJob] Nenhum recibo antigo a regenerar.");
        return;
    }
    let ok = 0;
    let falha = 0;
    for (const recibo of candidatos) {
        try {
            yield (0, reciboService_1.ensureReciboSeal)(Number(recibo.id));
            const pdfUrl = yield (0, reciboService_1.renderReciboPdf)(Number(recibo.id));
            if (pdfUrl) {
                yield ReciboModel_1.ReciboModel.update({ pdf_url: pdfUrl }, { where: { id: Number(recibo.id) } });
                ok += 1;
            }
            else {
                falha += 1;
            }
        }
        catch (error) {
            falha += 1;
            console.error(`[ReciboJob] Falha no recibo ${recibo.numero}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    }
    console.log(`[ReciboJob] Regeneração concluída: ${ok} gerado(s), ${falha} falha(s).`);
});
/**
 * Arranca a regeneração 20s após o servidor subir (deixa as migrações e as
 * rotas subirem primeiro) e não volta a correr — é uma migração de uma vez.
 * Se no futuro se quiser agendada, basta envolver em setInterval.
 */
const startReciboMigrationJob = () => {
    setTimeout(() => {
        regenerateOldReceipts().catch((error) => console.error("[ReciboJob] Erro no job de regeneração:", (error === null || error === void 0 ? void 0 : error.message) || error));
    }, 20 * 1000);
};
exports.startReciboMigrationJob = startReciboMigrationJob;
