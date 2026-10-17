import { CompanyModel } from "../database/models/CompanyModel";

/**
 * MODO DE CAIXA DA EMPRESA
 * ------------------------
 *  - PHYSICAL   → caixa de dinheiro físico: exige caixa aberto, folha de
 *                 contagem e conferência cega (regras anteriores).
 *  - ELECTRONIC → reconciliação manual por conta bancária JÁ EXISTENTE
 *                 (`accounts`): não bloqueia desembolsos/pagamentos por falta
 *                 de caixa aberto; o dia abre com o saldo inicial da conta e
 *                 fecha comparando o saldo real do banco com o teórico.
 *
 * O modo vive em `companies.cash_register_mode` (default ELECTRONIC).
 */
export const CASH_REGISTER_MODES = ["PHYSICAL", "ELECTRONIC"] as const;
export type CashRegisterMode = (typeof CASH_REGISTER_MODES)[number];

const normalizeMode = (value: any): CashRegisterMode =>
  String(value || "").toUpperCase() === "PHYSICAL" ? "PHYSICAL" : "ELECTRONIC";

/** Modo configurado na empresa (default ELECTRONIC). */
export const getCashRegisterMode = async (companyId: number): Promise<CashRegisterMode> => {
  if (!companyId) return "ELECTRONIC";
  const company: any = await CompanyModel.findOne({
    where: { id: companyId },
    attributes: ["id", "cash_register_mode"],
  });
  if (!company) return "ELECTRONIC";
  return normalizeMode(
    company.getDataValue ? company.getDataValue("cash_register_mode") : company.cash_register_mode
  );
};

/** true quando a empresa exige caixa físico aberto. */
export const isPhysicalCashMode = async (companyId: number): Promise<boolean> =>
  (await getCashRegisterMode(companyId)) === "PHYSICAL";

/** true quando a empresa usa o caixa electrónico manual. */
export const isElectronicCashMode = async (companyId: number): Promise<boolean> =>
  (await getCashRegisterMode(companyId)) === "ELECTRONIC";

/** Altera o modo da empresa (exclusivo do Admin — validado na rota). */
export const setCashRegisterMode = async (
  companyId: number,
  mode: string
): Promise<CashRegisterMode> => {
  const wanted = String(mode || "").trim().toUpperCase();
  if (!(CASH_REGISTER_MODES as readonly string[]).includes(wanted)) {
    throw {
      code: "INVALID_MODE",
      message: `Modo de caixa inválido (${wanted || "vazio"}). Use ${CASH_REGISTER_MODES.join(" ou ")}.`,
    };
  }

  const company: any = await CompanyModel.findOne({ where: { id: companyId } });
  if (!company) {
    throw { code: "NOT_FOUND", message: "Empresa não encontrada." };
  }

  await company.update({ cash_register_mode: wanted });
  return getCashRegisterMode(companyId);
};
