import { db } from "../database/db";
import { SmsQueueModel } from "../database/models/SmsQueueModel";
import { isCompanySmsEnabled } from "./SmsGatewayService";
import { todayKey } from "./cashRegisterService";

/**
 * SMS DE COBRANÇA POR ATRASO — job diário (Fase 2 do MAISMOLA_BOT_AUDIT.md)
 *
 * Enfileira um SMS de cobrança por cliente com parcelas em atraso (a mesma
 * população da tool `clientes_em_atraso` do bot), ordenado por dias de atraso.
 *
 * Regras:
 *  - READ-ONLY nos dados de crédito: só escreve em `sms_queue` (nunca altera
 *    prestação, pagamento, caixa ou dívida).
 *  - Anti-duplicação: 1 SMS por cliente/dia (messageType = overdue_collection)
 *    — verificação na própria fila antes de criar.
 *  - Respeita `companies.smsEnabled` (via isCompanySmsEnabled).
 *  - Template sem acentos, max ~160 chars, valores em MZN.
 */

export type OverdueSmsResult = {
  companies: number;
  queued: number;
  skipped: number;
  errors: string[];
};

export type OverdueSmsCompanyResult = {
  companyId: number;
  queued: number;
  skipped: number;
};

type OverdueRow = {
  customerId: number;
  accountNumber: string | number;
  customerName: string;
  customerPhone: string;
  parcelas_atraso: number;
  valor_atraso: string | number;
  maior_atraso_dias: number;
  vencimento_mais_antigo: string;
};

const safeMoney = (value: any): string =>
  Number(value || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(/[\u00A0\u202F]/g, ".");

const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12) return digits.slice(3);
  if (digits.length === 9) return digits;
  return null;
};

/**
 * Enfileira SMS de cobrança para os clientes em atraso de UMA empresa.
 * Reutiliza a mesma query do ranking do bot (overdue = status 0 + dueDate < hoje).
 */
export const enqueueOverdueCollectionSms = async (params: {
  companyId: number;
  limite?: number;      // máx. de clientes por corrida (default 50)
  diasMinimos?: number; // só atrasos >= X dias (default 3 — cobrança "fria")
}): Promise<OverdueSmsCompanyResult> => {
  const result: OverdueSmsCompanyResult = {
    companyId: params.companyId,
    queued: 0,
    skipped: 0,
  };

  if (!(await isCompanySmsEnabled(params.companyId))) {
    return result;
  }

  const limite = Math.min(Math.max(Number(params.limite) || 50, 1), 200);
  const diasMinimos = Math.max(Number(params.diasMinimos) || 3, 1);

  // Mesma lógica da tool clientes_em_atraso (Amarela 16 do audit).
  const [rows] = await db.query(
    `SELECT
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
     LIMIT :limite`,
    { replacements: { companyId: params.companyId, limite, diasMinimos } }
  );

  for (const row of ((rows as OverdueRow[]) || [])) {
    try {
      const phone = normalizePhone(row.customerPhone);
      if (!phone) {
        result.skipped += 1;
        continue;
      }

      // Anti-duplicação: 1 SMS de cobrança por cliente/dia.
      const existent = await SmsQueueModel.findOne({
        where: {
          companyId: params.companyId,
          customerId: row.customerId,
          messageType: "overdue_collection",
          status: ["queued", "processing", "sent"],
          createdAt: { $gte: new Date(`${todayKey()}T00:00:00`) } as any,
        },
      } as any);
      if (existent) {
        result.skipped += 1;
        continue;
      }

      const valor = safeMoney(row.valor_atraso);
      const dias = Number(row.maior_atraso_dias) || 0;
      const nome = String(row.customerName || "").split(" ")[0];

      const messageBody =
        `Ola ${nome}. Tem ${row.parcelas_atraso} prestacao(oes) em atraso ha ${dias} dia(s), ` +
        `total ${valor} MZN. Regularize para evitar juros. MaisMola Microcredito.`;

      await SmsQueueModel.create({
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
    } catch (e: any) {
      result.skipped += 1;
      console.error(
        `[SMS Cobranca] Erro no cliente ${row?.accountNumber}:`,
        e?.message || e
      );
    }
  }

  return result;
};

/**
 * Job diário — percorre todas as empresas. Chamado pelo agendador no app.ts.
 * Devolve resumo agregado (para log).
 */
export const runDailyOverdueCollectionSms = async (
  companyIds: number[]
): Promise<OverdueSmsResult> => {
  const summary: OverdueSmsResult = {
    companies: 0,
    queued: 0,
    skipped: 0,
    errors: [],
  };

  for (const companyId of companyIds) {
    try {
      const r = await enqueueOverdueCollectionSms({ companyId });
      summary.companies += 1;
      summary.queued += r.queued;
      summary.skipped += r.skipped;
    } catch (e: any) {
      summary.errors.push(`company ${companyId}: ${e?.message || e}`);
    }
  }

  console.log(
    `[SMS Cobranca] Job diario: ${summary.queued} enfileirado(s), ` +
      `${summary.skipped} ignorado(s) em ${summary.companies} empresa(s)` +
      (summary.errors.length ? ` | erros: ${summary.errors.join("; ")}` : "")
  );

  return summary;
};
