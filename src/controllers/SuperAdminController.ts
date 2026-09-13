import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { db } from "../database/db";
import { CompanyModel } from "../database/models/CompanyModel";
import { UserModel } from "../database/models/UserModel";
import { hashPasswordIfNeeded } from "../utils/password";

/**
 * FLUXO DE SUBSCRIÇÃO — cadastro público de empresas de microcrédito,
 * aprovação pelo Super Admin (userRole = 0, companyId = NULL),
 * planos de subscrição e gestão de Super Admins.
 */

// ── Middleware: apenas Super Admin (userRole = 0) ──
export const isSuperAdmin = async (req: Request, res: Response, next: any) => {
  const token = String(req.headers.authorization || "").split(" ")[1] || "";
  try {
    const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
    const user: any = await UserModel.findByPk(decoded?.id, {
      attributes: ["id", "userRole"],
    });
    if (Number(user?.getDataValue?.("userRole")) !== 0) {
      return res.status(403).json({
        success: false,
        message: "Apenas Super Admin",
      });
    }
    (req as any).userId = Number(user.getDataValue("id"));
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token invalid" });
  }
};

// ── POST /api/companies/register (público) ──
export const registerCompany = async (req: Request, res: Response) => {
  try {
    const {
      companyName, companyNuit, licenseNumber, provinceId, districtId,
      companyAddress, companyPhone, companyEmail,
      responsibleName, responsiblePhone, responsibleEmail, password,
      plan, planId, planSlug, acceptedTerms,
    } = req.body;

    if (!companyName || !companyNuit || !companyPhone || !companyEmail ||
        !responsibleName || !responsiblePhone || !responsibleEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Preencha todos os campos obrigatórios.",
      });
    }
    if (!acceptedTerms) {
      return res.status(400).json({
        success: false,
        message: "É obrigatório aceitar os termos e a validação dos dados.",
      });
    }
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "A senha deve ter pelo menos 6 caracteres.",
      });
    }

    // Plano: validar plan_id (ou slug) existe e está activo
    let finalPlanId: number | null = null;
    let finalPlanSlug: string = "CRESCIMENTO";
    const wantedId = planId ?? (plan && /^\d+$/.test(String(plan)) ? Number(plan) : null);
    const wantedSlug = planSlug || (plan && !/^\d+$/.test(String(plan)) ? String(plan).toUpperCase() : null);

    try {
      let planRows: any[];
      if (wantedId) {
        [planRows] = await db.query(
          "SELECT id, slug FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1",
          { replacements: [wantedId] }
        );
      } else if (wantedSlug) {
        [planRows] = await db.query(
          "SELECT id, slug FROM subscription_plans WHERE (slug = ? OR UPPER(slug) = ?) AND is_active = 1 LIMIT 1",
          { replacements: [wantedSlug, wantedSlug] }
        );
      } else {
        [planRows] = await db.query(
          "SELECT id, slug FROM subscription_plans WHERE is_popular = 1 AND is_active = 1 LIMIT 1"
        );
      }
      const planRow = (planRows as any[])[0];
      if (planRow) {
        finalPlanId = Number(planRow.id);
        finalPlanSlug = String(planRow.slug || finalPlanSlug).toUpperCase();
      }
    } catch { /* tabela pode não existir ainda — usa defaults */ }

    // Evitar duplicados por NUIT ou email de responsável
    const [dupNuit]: any = await db.query(
      "SELECT id FROM companies WHERE companyNuit = ? OR nuit = ? LIMIT 1",
      { replacements: [companyNuit, companyNuit] }
    );
    if ((dupNuit as any[]).length > 0) {
      return res.status(409).json({
        success: false,
        message: "Já existe uma empresa registada com este NUIT.",
      });
    }
    const dupUser = await UserModel.findOne({ where: { email: responsibleEmail } });
    if (dupUser) {
      return res.status(409).json({
        success: false,
        message: "Já existe uma conta com este e-mail.",
      });
    }

    const company = await CompanyModel.create({
      companyName,
      companyEmail,
      companyWebsite: "",
      companyManager: responsibleName,
      smsSender: companyName.slice(0, 11).toUpperCase().replace(/\s+/g, ""),
      companyNuit,
      companyPhone,
      districtId: districtId ? Number(districtId) : 1,
      provinceId: provinceId ? Number(provinceId) : 1,
      companyAddress: companyAddress || "",
      companyLogo: "",
      forfeit: 0,
      companyStatus: 1,
      nuit: companyNuit,
      phone: companyPhone,
      email: companyEmail,
      license_number: licenseNumber || null,
      plan_id: finalPlanId,
      plan: finalPlanSlug,
      approval_status: "PENDENTE",
      requested_at: new Date(),
    }) as any;

    // Admin da empresa — criado INACTIVO até aprovação
    await UserModel.create({
      companyId: company.id,
      name: responsibleName,
      email: responsibleEmail,
      password: hashPasswordIfNeeded(password),
      updatedPassword: 0,
      phone: responsiblePhone,
      status: 1,
      userRole: 1,
      is_active: 0,
    });

    // Notificação best-effort para o Super Admin
    try {
      await db.query(
        `INSERT INTO whatsapp_messages (companyId, phone, messageType, messageBody, status, direction, createdAt, updatedAt)
         VALUES (?, '+258870740202', 'NEW_COMPANY', ?, 'queued', 'outbound', NOW(), NOW())`,
        { replacements: [company.id, `Nova empresa registada: ${companyName} (plano ${finalPlanSlug}). Aguardando aprovação.`] }
      );
    } catch { /* tabela pode não existir em dev */ }

    return res.status(201).json({
      success: true,
      message: "Cadastro recebido, aguardando aprovação",
    });
  } catch (err: any) {
    console.error("[registerCompany]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// ── GET /api/super-admin/companies (role 0) ──
// Lista TODAS as empresas (sem filtro que esconde registos). Filtro por
// status é opcional via ?status= e inclui registos com status NULL.
export const listCompanies = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    console.log("[super-admin] GET /companies — status:", status || "(todos)");

    let rows: any[];
    if (status) {
      const st = String(status).toUpperCase();
      [rows] = await db.query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM users u WHERE u.companyId = c.id) AS userCount,
                (SELECT COALESCE(SUM(a.balance), 0) FROM accounts a WHERE a.companyId = c.id) AS bankBalance
         FROM companies c
         WHERE (c.approval_status = ? OR c.approval_status IS NULL)
         ORDER BY c.id DESC`,
        { replacements: [st] }
      );
    } else {
      [rows] = await db.query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM users u WHERE u.companyId = c.id) AS userCount,
                (SELECT COALESCE(SUM(a.balance), 0) FROM accounts a WHERE a.companyId = c.id) AS bankBalance
         FROM companies c
         ORDER BY c.id DESC`
      );
    }

    console.log(`[super-admin] ${rows.length} empresa(s) encontrada(s)`);
    return res.status(200).json({ success: true, result: rows });
  } catch (err: any) {
    console.error("[listCompanies]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// ── GET /api/debug/companies (TEMPORÁRIO, sem auth — apenas debug) ──
export const debugCompanies = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query("SELECT * FROM companies ORDER BY id DESC");
    return res.status(200).json({ success: true, count: (rows as any[]).length, result: rows });
  } catch (err: any) {
    console.error("[debugCompanies]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// ── POST /api/super-admin/companies/:id/approve (role 0) ──
// Body opcional: { planId } — plano atribuído (pode substituir o escolhido)
export const approveCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { planId } = req.body || {};
    const company: any = await CompanyModel.findByPk(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Empresa não encontrada." });
    }

    // Se o Super Admin escolheu outro plano na aprovação, copiar para a empresa
    if (planId) {
      try {
        await db.query(
          `UPDATE companies c
           JOIN subscription_plans p ON p.id = ?
           SET c.plan_id = p.id, c.plan = UPPER(p.slug)
           WHERE c.id = ?`,
          { replacements: [Number(planId), id] }
        );
      } catch (e: any) {
        console.error("[approveCompany] Erro ao copiar plano:", e?.message);
      }
    }

    await db.query(
      "UPDATE companies SET approval_status = 'APROVADA', approved_at = NOW(), approved_by = ?, rejection_reason = NULL WHERE id = ?",
      { replacements: [(req as any).userId ?? null, id] }
    );

    // Activa a conta do admin da empresa
    await db.query("UPDATE users SET is_active = 1 WHERE companyId = ? AND userRole = 1", {
      replacements: [id],
    });

    // Contas bancárias default (carteira real) — uma de banco + colecta M-Pesa
    const [existingAccounts]: any = await db.query(
      "SELECT id FROM accounts WHERE companyId = ? LIMIT 1",
      { replacements: [id] }
    );
    if ((existingAccounts as any[]).length === 0) {
      const companyName = company.getDataValue?.("companyName") || `Empresa ${id}`;
      await db.query(
        `INSERT INTO accounts
           (companyId, accountNumber, accountDescription, accountHolder, bank_name, bank_code,
            balance, initial_balance, purpose, type, is_default_reembolso, is_default_desembolso,
            is_active, currency, createdBy, updatedBy, createdAt, updatedAt)
         VALUES
           (?, '258000000000', 'Conta principal', ?, 'FNB', NULL, 0, 0, 'MISTO', 'BANCO', 1, 1, 1, 'MZN', 'sistema', 'sistema', NOW(), NOW()),
           (?, '258840000000', 'Colecta M-Pesa (portal)', ?, 'M-Pesa', NULL, 0, 0, 'REEMBOLSO', 'MOBILE_MONEY', 1, 0, 1, 'MZN', 'sistema', 'sistema', NOW(), NOW())`,
        { replacements: [id, companyName, id, companyName] }
      );
    }

    // Notificação para a empresa com as credenciais (best-effort)
    try {
      const admin: any = await UserModel.findOne({
        where: { companyId: id, userRole: 1 },
        attributes: ["email", "phone"],
      });
      if (admin) {
        await db.query(
          `INSERT INTO whatsapp_messages (companyId, phone, messageType, messageBody, status, direction, createdAt, updatedAt)
           VALUES (?, ?, 'APPROVAL', ?, 'queued', 'outbound', NOW(), NOW())`,
          {
            replacements: [
              id,
              admin.getDataValue("phone") || "+258870740202",
              `Bem-vindo ao Mais Mola! A empresa foi APROVADA. Aceda em /login com o e-mail ${admin.getDataValue("email")}. Contacto: +258 870740202`,
            ],
          }
        );
      }
    } catch { /* best-effort */ }

    return res.status(200).json({
      success: true,
      message: "Empresa aprovada com sucesso. O admin da empresa foi activado e notificado.",
    });
  } catch (err: any) {
    console.error("[approveCompany]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// ── POST /api/super-admin/companies/:id/reject (role 0) — body { reason } ──
export const rejectCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!reason) {
      return res.status(400).json({ success: false, message: "Informe o motivo da rejeição." });
    }
    const company: any = await CompanyModel.findByPk(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Empresa não encontrada." });
    }
    await db.query(
      "UPDATE companies SET approval_status = 'REJEITADA', rejection_reason = ?, approved_by = ? WHERE id = ?",
      { replacements: [reason, (req as any).userId ?? null, id] }
    );
    return res.status(200).json({ success: true, message: "Empresa rejeitada." });
  } catch (err: any) {
    console.error("[rejectCompany]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// ── POST /api/super-admin/companies/:id/suspend (role 0) ──
export const suspendCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE companies SET approval_status = 'SUSPENSA' WHERE id = ?", {
      replacements: [id],
    });
    return res.status(200).json({ success: true, message: "Empresa suspensa." });
  } catch (err: any) {
    console.error("[suspendCompany]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// ══════════════════════════════════════════════════════════
// SUPER ADMINS (role 0) — gestão por outro Super Admin
// ══════════════════════════════════════════════════════════

// GET /api/super-admin/users (role 0) — lista users WHERE userRole = 0
export const listSuperAdmins = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.findAll({
      where: { userRole: 0 },
      attributes: { exclude: ["password"] },
      order: [["id", "DESC"]],
    });
    return res.status(200).json({ success: true, result: users });
  } catch (err: any) {
    console.error("[listSuperAdmins]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// POST /api/super-admin/users (role 0) — cria outro Super Admin
export const createSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: name, email e password.",
      });
    }
    const dup = await UserModel.findOne({ where: { email } });
    if (dup) {
      return res.status(409).json({ success: false, message: "Já existe uma conta com este e-mail." });
    }
    const user = await UserModel.create({
      companyId: null as any, // Super Admin não pertence a nenhuma empresa
      name,
      email,
      password: hashPasswordIfNeeded(password),
      updatedPassword: 0,
      phone: phone || "",
      status: 1,
      userRole: 0,
      is_active: 1,
    });
    return res.status(201).json({ success: true, message: "Super Admin criado com sucesso.", id: (user as any).id });
  } catch (err: any) {
    console.error("[createSuperAdmin]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// DELETE /api/super-admin/users/:id (role 0) — nunca apagar a si mesmo
export const deleteSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (Number(id) === Number((req as any).userId)) {
      return res.status(400).json({ success: false, message: "Não pode eliminar a sua própria conta." });
    }
    await UserModel.destroy({ where: { id, userRole: 0 } });
    return res.status(200).json({ success: true, message: "Super Admin eliminado." });
  } catch (err: any) {
    console.error("[deleteSuperAdmin]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// ══════════════════════════════════════════════════════════
// PLANOS DE SUBSCRIÇÃO
// ══════════════════════════════════════════════════════════

// GET /api/subscription-plans — PÚBLICO (landing + registo)
// ?is_active=1 filtra apenas planos activos
export const listPlans = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;
    let sql = "SELECT * FROM subscription_plans";
    const replacements: any[] = [];
    if (is_active === "1" || is_active === "true") {
      sql += " WHERE is_active = 1";
    }
    sql += " ORDER BY price_mzn ASC";
    const [rows]: any = await db.query(sql, { replacements });
    return res.status(200).json({ success: true, result: rows });
  } catch (err: any) {
    console.error("[listPlans]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// POST /api/super-admin/plans (role 0) — criar plano
export const createPlan = async (req: Request, res: Response) => {
  try {
    const { name, slug, price_mzn, max_clients, features, is_popular, is_active } = req.body || {};
    if (!name || !slug || price_mzn == null || max_clients == null) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: name, slug, price_mzn e max_clients.",
      });
    }
    await db.query(
      `INSERT INTO subscription_plans (name, slug, price_mzn, max_clients, features, is_popular, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      {
        replacements: [
          name,
          String(slug).toLowerCase(),
          Number(price_mzn),
          Number(max_clients),
          JSON.stringify(features || []),
          is_popular ? 1 : 0,
          is_active === false ? 0 : 1,
        ],
      }
    );
    return res.status(201).json({ success: true, message: "Plano criado com sucesso." });
  } catch (err: any) {
    console.error("[createPlan]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// PUT /api/super-admin/plans/:id (role 0) — editar plano
export const updatePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, price_mzn, max_clients, features, is_popular, is_active } = req.body || {};
    await db.query(
      `UPDATE subscription_plans SET
         name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         price_mzn = COALESCE(?, price_mzn),
         max_clients = COALESCE(?, max_clients),
         features = COALESCE(?, features),
         is_popular = COALESCE(?, is_popular),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      {
        replacements: [
          name ?? null,
          slug ? String(slug).toLowerCase() : null,
          price_mzn != null ? Number(price_mzn) : null,
          max_clients != null ? Number(max_clients) : null,
          features != null ? JSON.stringify(features) : null,
          is_popular != null ? (is_popular ? 1 : 0) : null,
          is_active != null ? (is_active ? 1 : 0) : null,
          id,
        ],
      }
    );
    return res.status(200).json({ success: true, message: "Plano actualizado." });
  } catch (err: any) {
    console.error("[updatePlan]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

// DELETE /api/super-admin/plans/:id (role 0) — desactivar (soft) em vez de apagar
export const deactivatePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE subscription_plans SET is_active = 0 WHERE id = ?", { replacements: [id] });
    return res.status(200).json({ success: true, message: "Plano desactivado." });
  } catch (err: any) {
    console.error("[deactivatePlan]", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};
