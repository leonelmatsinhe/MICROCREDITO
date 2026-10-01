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
exports.runDailyOverdueCollectionSms = exports.enqueueOverdueCollectionSms = void 0;
const db_1 = require("../database/db");
const SmsQueueModel_1 = require("../database/models/SmsQueueModel");
const SmsGatewayService_1 = require("./SmsGatewayService");
const cashRegisterService_1 = require("./cashRegisterService");
const safeMoney = (value) => Number(value || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).replace(/[\u00A0\u202F]/g, ".");
const normalizePhone = (phone) => {
    if (!phone)
        return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 12)
        return digits.slice(3);
    if (digits.length === 9)
        return digits;
    return null;
};
/**
 * Enfileira SMS de cobrança para os clientes em atraso de UMA empresa.
 * Reutiliza a mesma query do ranking do bot (overdue = status 0 + dueDate < hoje).
 */
const enqueueOverdueCollectionSms = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const result = {
        companyId: params.companyId,
        queued: 0,
        skipped: 0,
    };
    if (!(yield (0, SmsGatewayService_1.isCompanySmsEnabled)(params.companyId))) {
        return result;
    }
    const limite = Math.min(Math.max(Number(params.limite) || 50, 1), 200);
    const diasMinimos = Math.max(Number(params.diasMinimos) || 3, 1);
    // Mesma lógica da tool clientes_em_atraso (Amarela 16 do audit).
    const [rows] = yield db_1.db.query(`SELECT
       c.id AS customerId,
       c.accountNumber,
       c.customerName,
       c.customerPhone,
       COUNT(*) AS parcelas_atraso,
       SUM(IFNULL(al.installment,0) - IFNULL(al.paidAmount,0)) AS valor_atraso,
       MAX(DATEDIFF(CURDATE(), CAST(al.dueDate AS DATE))) AS maior_atraso_dias,
       MIN(al.dueDate) AS vencimento_mais_antigo
     FROM amortization_loans al
     JOIN customers c ON c.id = al.customerId
     WHERE al.companyId = :companyId
       AND al.status = 0
       AND CAST(al.dueDate AS DATE) < CURDATE()
       AND DATEDIFF(CURDATE(), CAST(al.dueDate AS DATE)) >= :diasMinimos
     GROUP BY c.id, c.accountNumber, c.customerName, c.customerPhone
     ORDER BY maior_atraso_dias DESC, valor_atraso DESC
     LIMIT :limite`, { replacements: { companyId: params.companyId, limite, diasMinimos } });
    for (const row of (rows || [])) {
        try {
            const phone = normalizePhone(row.customerPhone);
            if (!phone) {
                result.skipped += 1;
                continue;
            }
            // Anti-duplicação: 1 SMS de cobrança por cliente/dia.
            const existent = yield SmsQueueModel_1.SmsQueueModel.findOne({
                where: {
                    companyId: params.companyId,
                    customerId: row.customerId,
                    messageType: "overdue_collection",
                    status: ["queued", "processing", "sent"],
                    createdAt: { $gte: new Date(`${(0, cashRegisterService_1.todayKey)()}T00:00:00`) },
                },
            });
            if (existent) {
                result.skipped += 1;
                continue;
            }
            const valor = safeMoney(row.valor_atraso);
            const dias = Number(row.maior_atraso_dias) || 0;
            const nome = String(row.customerName || "").split(" ")[0];
            const messageBody = `Ola ${nome}. Tem ${row.parcelas_atraso} prestacao(oes) em atraso ha ${dias} dia(s), ` +
                `total ${valor} MZN. Regularize para evitar juros. MaisMola Microcredito.`;
            yield SmsQueueModel_1.SmsQueueModel.create({
                companyId: params.companyId,
                accountNumber: String(row.accountNumber),
                customerId: row.customerId,
                customerName: row.customerName,
                phone,
                messageType: "overdue_collection",
                messageBody,
                payloadJson: JSON.stringify({
                    parcelas_atraso: row.parcelas_atraso,
                    valor_atraso: Number(row.valor_atraso) || 0,
                    maior_atraso_dias: dias,
                    vencimento_mais_antigo: row.vencimento_mais_antigo,
                    dias_minimos: diasMinimos,
                    gerado_por: "job_overdue_collection",
                }),
                status: "queued",
            });
            result.queued += 1;
        }
        catch (e) {
            result.skipped += 1;
            console.error(`[SMS Cobranca] Erro no cliente ${row === null || row === void 0 ? void 0 : row.accountNumber}:`, (e === null || e === void 0 ? void 0 : e.message) || e);
        }
    }
    return result;
});
exports.enqueueOverdueCollectionSms = enqueueOverdueCollectionSms;
/**
 * Job diário — percorre todas as empresas. Chamado pelo agendador no app.ts.
 * Devolve resumo agregado (para log).
 */
const runDailyOverdueCollectionSms = (companyIds) => __awaiter(void 0, void 0, void 0, function* () {
    const summary = {
        companies: 0,
        queued: 0,
        skipped: 0,
        errors: [],
    };
    for (const companyId of companyIds) {
        try {
            const r = yield (0, exports.enqueueOverdueCollectionSms)({ companyId });
            summary.companies += 1;
            summary.queued += r.queued;
            summary.skipped += r.skipped;
        }
        catch (e) {
            summary.errors.push(`company ${companyId}: ${(e === null || e === void 0 ? void 0 : e.message) || e}`);
        }
    }
    console.log(`[SMS Cobranca] Job diario: ${summary.queued} enfileirado(s), ` +
        `${summary.skipped} ignorado(s) em ${summary.companies} empresa(s)` +
        (summary.errors.length ? ` | erros: ${summary.errors.join("; ")}` : ""));
    return summary;
});
exports.runDailyOverdueCollectionSms = runDailyOverdueCollectionSms;
