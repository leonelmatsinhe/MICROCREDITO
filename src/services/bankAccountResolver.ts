import { Op } from "sequelize";
import { db } from "../database/db";
import { AccountModel, ACCOUNT_PURPOSES } from "../database/models/AccountModel";
import { round2, num } from "../utils/money";

/**
 * RESOLVER DE CONTAS DE DESTINO DE PAGAMENTO (V2).
 *
 * Tabela REAL: `accounts` (a "carteira real" da empresa — FNB, Moza, M-Pesa,
 * caixa físico...). A coluna de tipo/finalidade é `purpose` ENUM:
 *   REEMBOLSO | DESEMBOLSO | MISTO | TAXAS | RESERVA
 * e `type` separa a natureza: BANCO | CAIXA_FISICO | MOBILE_MONEY | EWALLET.
 *
 * Regras do modal "Registar Pagamento":
 *   - CASH (dinheiro)         → CAIXA_FISICO primeiro, depois MISTO
 *   - BANK/TRANSFERÊNCIA      → REEMBOLSO primeiro, depois MISTO
 *   - MPESA/EMOLA (mobile)    → MOBILE_MONEY (MISTO com "mpesa/emola" no nome) primeiro
 *   - MISTO entra sempre (aceita ambos os fluxos)
 * Contas DESEMBOLSO/TAXAS/RESERVA NUNCA aparecem (não são destino de pagamento).
 */

export const REEMBOLSO_PURPOSES = ["REEMBOLSO", "MISTO"] as const;

export type ReembolsoAccount = {
  id: number;
  name: string;
  bank_name: string;
  account_number: string;
  purpose: string;
  type: string;
  balance: number;
  is_default_reembolso: boolean;
};

const plainAccount = (a: any): ReembolsoAccount => ({
  id: Number(a.id),
  name: String(a.accountDescription || a.bank_name || `Conta ${a.id}`),
  bank_name: String(a.bank_name || ""),
  account_number: String(a.accountNumber || ""),
  purpose: String(a.purpose || ""),
  type: String(a.type || ""),
  balance: round2(num(a.balance)),
  is_default_reembolso: !!Number(a.is_default_reembolso),
});

/**
 * Contas válidas como DESTINO de pagamento para a empresa.
 * Ordenação (prioridade) por método de pagamento:
 *   - default: is_default_reembolso → MISTO → REEMBOLSO → restantes
 *   - CASH:    CAIXA_FISICO primeiro
 *   - MPESA/EMOLA: MOBILE_MONEY primeiro (e nomes com mpesa/e-mola sobem)
 *   - BANK:    BANCO REEMBOLSO primeiro
 */
export const getReembolsoAccounts = async (
  companyId: number,
  paymentMethod?: string | number | null
): Promise<ReembolsoAccount[]> => {
  const accounts: any[] = await AccountModel.findAll({
    where: {
      companyId: Number(companyId),
      is_active: 1,
      purpose: { [Op.in]: ["REEMBOLSO", "MISTO"] },
    },
    order: [["id", "ASC"]],
    raw: true,
  });

  const method = String(paymentMethod ?? "").toUpperCase();
  // Códigos legados: 1=Numerário, 3=Transferência, 7=M-Pesa (form do Quasar)
  const isCash = method === "CASH" || method === "1";
  const isMobile = method === "MPESA" || method === "EMOLA" || method === "7" || method === "6";
  const isBank = method === "BANK" || method === "3" || method === "4" || method === "5";

  const score = (a: any): number => {
    let s = 0;
    const purpose = String(a.purpose || "");
    const type = String(a.type || "");
    const name = String(a.accountDescription || a.bank_name || "").toLowerCase();
    if (Number(a.is_default_reembolso)) s -= 100;
    if (purpose === "MISTO") s -= 20;
    if (isCash && type === "CAIXA_FISICO") s -= 50;
    if (isMobile && type === "MOBILE_MONEY") s -= 60;
    if (isMobile && (name.includes("mpesa") || name.includes("m-pesa"))) s -= 30;
    if (isMobile && name.includes("e-mola")) s -= 25;
    if (isBank && type === "BANCO" && purpose === "REEMBOLSO") s -= 40;
    return s;
  };

  return accounts
    .map(plainAccount)
    .sort((a, b) => score(a) - score(b) || a.id - b.id);
};

/**
 * Valida 1 conta como destino de pagamento:
 * mesma empresa, activa e purpose REEMBOLSO/MISTO.
 * (Contas DESPESA/DESEMBOLSO/TAXAS/RESERVA → 400 INVALID_BANK_ACCOUNT.)
 */
export const validateReembolsoAccount = async (
  bankAccountId: number,
  companyId: number
): Promise<ReembolsoAccount> => {
  const account: any = await AccountModel.findOne({
    where: {
      id: Number(bankAccountId),
      companyId: Number(companyId),
      is_active: 1,
      purpose: { [Op.in]: ["REEMBOLSO", "MISTO"] },
    },
  });
  if (!account) {
    throw { http: 400, payload: { success: false, code: "INVALID_BANK_ACCOUNT", message: "Conta de destino inválida (exige REEMBOLSO ou MISTO activa desta empresa)." } };
  }
  return plainAccount(account);
};

/**
 * Fallback: conta de destino quando nem o pedido nem o caixa aberto indicam
 * a conta. Prioriza CAIXA_FISICO (dinheiro vivo); se a empresa não tiver
 * caixa físico registado (caso real: empresa 36), cai para a primeira conta
 * REEMBOLSO/MISTO activa (preferindo a default de reembolso).
 */
export const getFirstCashAccount = async (companyId: number): Promise<ReembolsoAccount | null> => {
  const cash: any = await AccountModel.findOne({
    where: { companyId: Number(companyId), is_active: 1, type: "CAIXA_FISICO" },
    order: [["id", "ASC"]],
  });
  if (cash) return plainAccount(cash);

  // Sem CAIXA_FISICO: qualquer REEMBOLSO/MISTO activa serve de destino
  // (default de reembolso primeiro, depois MISTO, depois id).
  const anyDest: any = await AccountModel.findOne({
    where: { companyId: Number(companyId), is_active: 1, purpose: { [Op.in]: ["REEMBOLSO", "MISTO"] } },
    order: [["is_default_reembolso", "DESC"], ["id", "ASC"]],
  });
  return anyDest ? plainAccount(anyDest) : null;
};

/**
 * Lê o saldo ACTUAL de uma conta (pós-pagamento) — para testes e UI.
 */
export const getAccountBalance = async (accountId: number): Promise<number> => {
  const [rows]: any = await db.query("SELECT balance FROM accounts WHERE id = ?", {
    replacements: [Number(accountId)],
  });
  return round2(num((rows as any[])[0]?.balance));
};
