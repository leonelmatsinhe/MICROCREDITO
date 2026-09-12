import { Request, Response } from "express";
import { AccountModel } from "../database/models/AccountModel";
import { Op } from "sequelize";
import { ACCOUNT_PURPOSES, ACCOUNT_TYPES } from "../database/models/AccountModel";

/**
 * CONTAS BANCÁRIAS — controlador legado das Configurações.
 *
 * FONTE ÚNICA DE VERDADE: a MESMA tabela `accounts` usada pelo módulo do
 * Caixa Central (`/api/bank-accounts`). Este controlador mantém os endpoints
 * antigos (/api/accounts, /api/account) mas já lê/grava as colunas novas da
 * carteira real (bank_name, type, purpose, defaults, is_active), para que
 * Configurações e Caixa Central mostrem sempre as MESMAS contas.
 *
 * O saldo (balance) NUNCA é alterado aqui — é exclusivo do treasuryService.
 */

// Campos permitidos em create/update (o saldo fica de fora de propósito).
const EDITABLE_FIELDS = [
  "accountNumber", "accountDescription", "accountHolder", "bank_name", "bank_code",
  "initial_balance", "purpose", "type", "is_default_reembolso", "is_default_desembolso",
  "is_active", "currency",
] as const;

const pickEditable = (body: any): Record<string, any> => {
  const payload: Record<string, any> = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (body?.[field] !== undefined) payload[field] = body[field];
  });
  return payload;
};

/**
 * Se a conta for marcada como default de reembolso/desembolso, limpa a marca
 * das restantes contas da empresa (uma só default por finalidade).
 */
const enforceSingleDefault = async (companyId: number, payload: Record<string, any>, excludeId?: number) => {
  for (const flag of ["is_default_reembolso", "is_default_desembolso"] as const) {
    if (Number(payload[flag]) === 1) {
      const where: any = { companyId, [flag]: 1 };
      if (excludeId) where.id = { [Op.ne]: excludeId };
      await AccountModel.update({ [flag]: 0 }, { where });
    }
  }
};

// Deriva o tipo de carteira a partir da descrição (M-Pesa → MOBILE_MONEY, etc.)
// quando o frontend não envia `type` — mantém compatibilidade com forms antigos.
const inferType = (description?: string | null): string => {
  const text = String(description || "").toLowerCase();
  if (text.includes("m-pesa") || text.includes("mpesa")) return "MOBILE_MONEY";
  if (text.includes("e-mola") || text.includes("emola")) return "MOBILE_MONEY";
  if (text.includes("caixa")) return "CAIXA_FISICO";
  return "BANCO";
};

const findAllaccounts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accounts = await AccountModel.findAll({
      where: { companyId: id },
      // Activas primeiro; dentro delas, as defaults no topo.
      order: [
        ["is_active", "DESC"],
        ["is_default_reembolso", "DESC"],
        ["is_default_desembolso", "DESC"],
        ["id", "DESC"],
      ],
    });

    // Retorna sempre 200 com array (vazio ou preenchido) para evitar problemas com status 204
    return res.status(200).json({ success: true, result: accounts || [] });
  } catch (error: any) {
    console.error("[accounts] Erro ao listar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar contas." });
  }
};

const findOneAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const account = await AccountModel.findOne({
    where: { id },
  });
  return account != null
    ? res.status(200).send({ success: true, result: account })
    : res.status(204).send({
      success: false,
      result: "No account found with the ID provided",
    });
};

const createAccount = async (req: Request, res: Response) => {
  try {
    const { accountHolder, accountDescription, accountNumber, createdBy, companyId } = req.body;

    if (!accountNumber || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Número da conta e empresa são obrigatórios.",
      });
    }

    const payload = pickEditable(req.body);

    // Defaults sensatos quando o form antigo não envia as colunas novas:
    // banco derivado da descrição (M-Pesa/e-Mola/Caixa) e finalidade MISTO.
    if (!payload.type) payload.type = inferType(accountDescription);
    if (!payload.purpose) payload.purpose = "MISTO";
    if (payload.is_active === undefined) payload.is_active = 1;

    await enforceSingleDefault(Number(companyId), payload);

    const newAccount = await AccountModel.create({
      companyId,
      accountHolder,
      accountDescription,
      accountNumber,
      createdBy: String(createdBy ?? "sistema"),
      bank_name: payload.bank_name ?? accountDescription ?? "",
      ...payload,
    });

    return newAccount != null
      ? res.status(201).json({ success: true, message: "Account created successfully.", result: newAccount })
      : res.status(400).json({ success: false, message: "There was an error creating the account." });
  } catch (error: any) {
    console.error("[accounts] Erro ao criar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao criar a conta." });
  }
};

const updateAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const account: any = await AccountModel.findOne({ where: { id } });
    if (!account) {
      return res.status(404).json({ success: false, message: "Conta não encontrada." });
    }

    const payload = pickEditable(req.body);

    // Nunca permitir gravar saldo por este caminho (exclusivo do treasury).
    delete payload.balance;

    await enforceSingleDefault(Number(account.getDataValue("companyId")), payload, Number(id));

    if (Object.keys(payload).length > 0) {
      await account.update(payload);
    }

    return res.json({ success: true, message: "Account updated successfully", result: account });
  } catch (error: any) {
    console.error("[accounts] Erro ao actualizar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao actualizar a conta." });
  }
};

/**
 * ELIMINAR = DESACTIVAR (soft delete).
 * Contas podem ter movimentos em bank_transactions/cash_movements — apagar a
 * linha quebraria o histórico da tesouraria. Passa a is_active=0 e deixa de
 * aparecer nos selects, mantendo o histórico intacto.
 */
const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const account: any = await AccountModel.findOne({ where: { id } });
    if (!account) {
      return res.status(404).json({ success: false, message: "Conta não encontrada." });
    }

    await account.update({ is_active: 0, is_default_reembolso: 0, is_default_desembolso: 0 });

    return res.status(200).json({
      success: true,
      message: "Conta desactivada (o histórico financeiro foi preservado).",
    });
  } catch (error: any) {
    console.error("[accounts] Erro ao desactivar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao desactivar a conta." });
  }
};

export {
  findAllaccounts,
  findOneAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  ACCOUNT_PURPOSES,
  ACCOUNT_TYPES,
};
