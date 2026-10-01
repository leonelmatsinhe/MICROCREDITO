import { ReciboModel } from "../database/models/ReciboModel";
import { ensureReciboSeal, renderReciboPdf } from "../services/reciboService";
import fs from "fs";
import path from "path";
import { Op } from "sequelize";

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

const pdfFileMissing = (pdfUrl: any): boolean => {
  if (!pdfUrl) return true;
  const abs = path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl)));
  return !fs.existsSync(abs);
};

const regenerateOldReceipts = async (): Promise<void> => {
  const candidatos: any[] = (await ReciboModel.findAll({
    where: { pdf_url: null as any },
    limit: BATCH_SIZE,
    order: [["id", "ASC"]],
    raw: true,
  })) as any[];

  // Recibos com pdf_url gravado mas ficheiro apagado (ex.: limpeza de uploads).
  if (candidatos.length === 0) {
    const comUrl: any[] = (await ReciboModel.findAll({
      where: { pdf_url: { [Op.ne]: null } as any },
      attributes: ["id", "pdf_url"],
      limit: 500,
      order: [["id", "DESC"]],
      raw: true,
    })) as any[];
    for (const recibo of comUrl) {
      if (pdfFileMissing(recibo.pdf_url)) candidatos.push(recibo);
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
      await ensureReciboSeal(Number(recibo.id));
      const pdfUrl = await renderReciboPdf(Number(recibo.id));
      if (pdfUrl) {
        await ReciboModel.update({ pdf_url: pdfUrl }, { where: { id: Number(recibo.id) } });
        ok += 1;
      } else {
        falha += 1;
      }
    } catch (error: any) {
      falha += 1;
      console.error(`[ReciboJob] Falha no recibo ${recibo.numero}:`, error?.message || error);
    }
  }
  console.log(`[ReciboJob] Regeneração concluída: ${ok} gerado(s), ${falha} falha(s).`);
};

/**
 * Arranca a regeneração 20s após o servidor subir (deixa as migrações e as
 * rotas subirem primeiro) e não volta a correr — é uma migração de uma vez.
 * Se no futuro se quiser agendada, basta envolver em setInterval.
 */
export const startReciboMigrationJob = (): void => {
  setTimeout(() => {
    regenerateOldReceipts().catch((error: any) =>
      console.error("[ReciboJob] Erro no job de regeneração:", error?.message || error)
    );
  }, 20 * 1000);
};
