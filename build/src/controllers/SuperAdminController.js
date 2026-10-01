"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.deactivatePlan = exports.updatePlan = exports.createPlan = exports.listPlans = exports.deleteSuperAdmin = exports.createSuperAdmin = exports.listSuperAdmins = exports.suspendCompany = exports.rejectCompany = exports.approveCompany = exports.debugCompanies = exports.listCompanies = exports.registerCompany = exports.isSuperAdmin = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = require("../database/db");
const CompanyModel_1 = require("../database/models/CompanyModel");
const UserModel_1 = require("../database/models/UserModel");
const password_1 = require("../utils/password");
/**
 * FLUXO DE SUBSCRIÇÃO — cadastro público de empresas de microcrédito,
 * aprovação pelo Super Admin (userRole = 0, companyId = NULL),
 * planos de subscrição e gestão de Super Admins.
 */
// ── Middleware: apenas Super Admin (userRole = 0) ──
const isSuperAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = String(req.headers.authorization || "").split(" ")[1] || "";
    try {
        const decoded = jwt.verify(token, process.env.APP_SECRET + "");
        const user = yield UserModel_1.UserModel.findByPk(decoded === null || decoded === void 0 ? void 0 : decoded.id, {
            attributes: ["id", "userRole"],
        });
        if (Number((_a = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _a === void 0 ? void 0 : _a.call(user, "userRole")) !== 0) {
            return res.status(403).json({
                success: false,
                message: "Apenas Super Admin",
            });
        }
        req.userId = Number(user.getDataValue("id"));
        next();
    }
    catch (_b) {
        return res.status(401).json({ success: false, message: "Token invalid" });
    }
});
exports.isSuperAdmin = isSuperAdmin;
// ── POST /api/companies/register (público) ──
const registerCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyName, companyNuit, licenseNumber, provinceId, districtId, companyAddress, companyPhone, companyEmail, responsibleName, responsiblePhone, responsibleEmail, password, plan, planId, planSlug, acceptedTerms, } = req.body;
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
        let finalPlanId = null;
        let finalPlanSlug = "CRESCIMENTO";
        const wantedId = planId !== null && planId !== void 0 ? planId : (plan && /^\d+$/.test(String(plan)) ? Number(plan) : null);
        const wantedSlug = planSlug || (plan && !/^\d+$/.test(String(plan)) ? String(plan).toUpperCase() : null);
        try {
            let planRows;
            if (wantedId) {
                [planRows] = yield db_1.db.query("SELECT id, slug FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1", { replacements: [wantedId] });
            }
            else if (wantedSlug) {
                [planRows] = yield db_1.db.query("SELECT id, slug FROM subscription_plans WHERE (slug = ? OR UPPER(slug) = ?) AND is_active = 1 LIMIT 1", { replacements: [wantedSlug, wantedSlug] });
            }
            else {
                [planRows] = yield db_1.db.query("SELECT id, slug FROM subscription_plans WHERE is_popular = 1 AND is_active = 1 LIMIT 1");
            }
            const planRow = planRows[0];
            if (planRow) {
                finalPlanId = Number(planRow.id);
                finalPlanSlug = String(planRow.slug || finalPlanSlug).toUpperCase();
            }
        }
        catch ( /* tabela pode não existir ainda — usa defaults */_c) { /* tabela pode não existir ainda — usa defaults */ }
        // Evitar duplicados por NUIT ou email de responsável
        const [dupNuit] = yield db_1.db.query("SELECT id FROM companies WHERE companyNuit = ? OR nuit = ? LIMIT 1", { replacements: [companyNuit, companyNuit] });
        if (dupNuit.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Já existe uma empresa registada com este NUIT.",
            });
        }
        const dupUser = yield UserModel_1.UserModel.findOne({ where: { email: responsibleEmail } });
        if (dupUser) {
            return res.status(409).json({
                success: false,
                message: "Já existe uma conta com este e-mail.",
            });
        }
        const company = yield CompanyModel_1.CompanyModel.create({
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
        });
        // Admin da empresa — criado INACTIVO até aprovação
        yield UserModel_1.UserModel.create({
            companyId: company.id,
            name: responsibleName,
            email: responsibleEmail,
            password: (0, password_1.hashPasswordIfNeeded)(password),
            updatedPassword: 0,
            phone: responsiblePhone,
            status: 1,
            userRole: 1,
            is_active: 0,
        });
        // Notificação best-effort para o Super Admin
        try {
            yield db_1.db.query(`INSERT INTO whatsapp_messages (companyId, phone, messageType, messageBody, status, direction, createdAt, updatedAt)
         VALUES (?, '+258870740202', 'NEW_COMPANY', ?, 'queued', 'outbound', NOW(), NOW())`, { replacements: [company.id, `Nova empresa registada: ${companyName} (plano ${finalPlanSlug}). Aguardando aprovação.`] });
        }
        catch ( /* tabela pode não existir em dev */_d) { /* tabela pode não existir em dev */ }
        return res.status(201).json({
            success: true,
            message: "Cadastro recebido, aguardando aprovação",
        });
    }
    catch (err) {
        console.error("[registerCompany]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.registerCompany = registerCompany;
// ── GET /api/super-admin/companies (role 0) ──
// Lista TODAS as empresas (sem filtro que esconde registos). Filtro por
// status é opcional via ?status= e inclui registos com status NULL.
const listCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        console.log("[super-admin] GET /companies — status:", status || "(todos)");
        let rows;
        if (status) {
            const st = String(status).toUpperCase();
            [rows] = yield db_1.db.query(`SELECT c.*,
                (SELECT COUNT(*) FROM users u WHERE u.companyId = c.id) AS userCount,
                (SELECT COALESCE(SUM(a.balance), 0) FROM accounts a WHERE a.companyId = c.id) AS bankBalance
         FROM companies c
         WHERE (c.approval_status = ? OR c.approval_status IS NULL)
         ORDER BY c.id DESC`, { replacements: [st] });
        }
        else {
            [rows] = yield db_1.db.query(`SELECT c.*,
                (SELECT COUNT(*) FROM users u WHERE u.companyId = c.id) AS userCount,
                (SELECT COALESCE(SUM(a.balance), 0) FROM accounts a WHERE a.companyId = c.id) AS bankBalance
         FROM companies c
         ORDER BY c.id DESC`);
        }
        console.log(`[super-admin] ${rows.length} empresa(s) encontrada(s)`);
        return res.status(200).json({ success: true, result: rows });
    }
    catch (err) {
        console.error("[listCompanies]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.listCompanies = listCompanies;
// ── GET /api/debug/companies (TEMPORÁRIO, sem auth — apenas debug) ──
const debugCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.db.query("SELECT * FROM companies ORDER BY id DESC");
        return res.status(200).json({ success: true, count: rows.length, result: rows });
    }
    catch (err) {
        console.error("[debugCompanies]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.debugCompanies = debugCompanies;
// ── POST /api/super-admin/companies/:id/approve (role 0) ──
// Body opcional: { planId } — plano atribuído (pode substituir o escolhido)
const approveCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f;
    try {
        const { id } = req.params;
        const { planId } = req.body || {};
        const company = yield CompanyModel_1.CompanyModel.findByPk(id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
        // Se o Super Admin escolheu outro plano na aprovação, copiar para a empresa
        if (planId) {
            try {
                yield db_1.db.query(`UPDATE companies c
           JOIN subscription_plans p ON p.id = ?
           SET c.plan_id = p.id, c.plan = UPPER(p.slug)
           WHERE c.id = ?`, { replacements: [Number(planId), id] });
            }
            catch (e) {
                console.error("[approveCompany] Erro ao copiar plano:", e === null || e === void 0 ? void 0 : e.message);
            }
        }
        yield db_1.db.query("UPDATE companies SET approval_status = 'APROVADA', approved_at = NOW(), approved_by = ?, rejection_reason = NULL WHERE id = ?", { replacements: [(_e = req.userId) !== null && _e !== void 0 ? _e : null, id] });
        // Activa a conta do admin da empresa
        yield db_1.db.query("UPDATE users SET is_active = 1 WHERE companyId = ? AND userRole = 1", {
            replacements: [id],
        });
        // Contas bancárias default (carteira real) — uma de banco + colecta M-Pesa
        const [existingAccounts] = yield db_1.db.query("SELECT id FROM accounts WHERE companyId = ? LIMIT 1", { replacements: [id] });
        if (existingAccounts.length === 0) {
            const companyName = ((_f = company.getDataValue) === null || _f === void 0 ? void 0 : _f.call(company, "companyName")) || `Empresa ${id}`;
            yield db_1.db.query(`INSERT INTO accounts
           (companyId, accountNumber, accountDescription, accountHolder, bank_name, bank_code,
            balance, initial_balance, purpose, type, is_default_reembolso, is_default_desembolso,
            is_active, currency, createdBy, updatedBy, createdAt, updatedAt)
         VALUES
           (?, '258000000000', 'Conta principal', ?, 'FNB', NULL, 0, 0, 'MISTO', 'BANCO', 1, 1, 1, 'MZN', 'sistema', 'sistema', NOW(), NOW()),
           (?, '258840000000', 'Colecta M-Pesa (portal)', ?, 'M-Pesa', NULL, 0, 0, 'REEMBOLSO', 'MOBILE_MONEY', 1, 0, 1, 'MZN', 'sistema', 'sistema', NOW(), NOW())`, { replacements: [id, companyName, id, companyName] });
        }
        // Notificação para a empresa com as credenciais (best-effort)
        try {
            const admin = yield UserModel_1.UserModel.findOne({
                where: { companyId: id, userRole: 1 },
                attributes: ["email", "phone"],
            });
            if (admin) {
                yield db_1.db.query(`INSERT INTO whatsapp_messages (companyId, phone, messageType, messageBody, status, direction, createdAt, updatedAt)
           VALUES (?, ?, 'APPROVAL', ?, 'queued', 'outbound', NOW(), NOW())`, {
                    replacements: [
                        id,
                        admin.getDataValue("phone") || "+258870740202",
                        `Bem-vindo ao Mais Mola! A empresa foi APROVADA. Aceda em /login com o e-mail ${admin.getDataValue("email")}. Contacto: +258 870740202`,
                    ],
                });
            }
        }
        catch ( /* best-effort */_g) { /* best-effort */ }
        return res.status(200).json({
            success: true,
            message: "Empresa aprovada com sucesso. O admin da empresa foi activado e notificado.",
        });
    }
    catch (err) {
        console.error("[approveCompany]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.approveCompany = approveCompany;
// ── POST /api/super-admin/companies/:id/reject (role 0) — body { reason } ──
const rejectCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _h;
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        if (!reason) {
            return res.status(400).json({ success: false, message: "Informe o motivo da rejeição." });
        }
        const company = yield CompanyModel_1.CompanyModel.findByPk(id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
        yield db_1.db.query("UPDATE companies SET approval_status = 'REJEITADA', rejection_reason = ?, approved_by = ? WHERE id = ?", { replacements: [reason, (_h = req.userId) !== null && _h !== void 0 ? _h : null, id] });
        return res.status(200).json({ success: true, message: "Empresa rejeitada." });
    }
    catch (err) {
        console.error("[rejectCompany]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.rejectCompany = rejectCompany;
// ── POST /api/super-admin/companies/:id/suspend (role 0) ──
const suspendCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.db.query("UPDATE companies SET approval_status = 'SUSPENSA' WHERE id = ?", {
            replacements: [id],
        });
        return res.status(200).json({ success: true, message: "Empresa suspensa." });
    }
    catch (err) {
        console.error("[suspendCompany]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.suspendCompany = suspendCompany;
// ══════════════════════════════════════════════════════════
// SUPER ADMINS (role 0) — gestão por outro Super Admin
// ══════════════════════════════════════════════════════════
// GET /api/super-admin/users (role 0) — lista users WHERE userRole = 0
const listSuperAdmins = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield UserModel_1.UserModel.findAll({
            where: { userRole: 0 },
            attributes: { exclude: ["password"] },
            order: [["id", "DESC"]],
        });
        return res.status(200).json({ success: true, result: users });
    }
    catch (err) {
        console.error("[listSuperAdmins]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.listSuperAdmins = listSuperAdmins;
// POST /api/super-admin/users (role 0) — cria outro Super Admin
const createSuperAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, password } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Campos obrigatórios: name, email e password.",
            });
        }
        const dup = yield UserModel_1.UserModel.findOne({ where: { email } });
        if (dup) {
            return res.status(409).json({ success: false, message: "Já existe uma conta com este e-mail." });
        }
        const user = yield UserModel_1.UserModel.create({
            companyId: null,
            name,
            email,
            password: (0, password_1.hashPasswordIfNeeded)(password),
            updatedPassword: 0,
            phone: phone || "",
            status: 1,
            userRole: 0,
            is_active: 1,
        });
        return res.status(201).json({ success: true, message: "Super Admin criado com sucesso.", id: user.id });
    }
    catch (err) {
        console.error("[createSuperAdmin]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.createSuperAdmin = createSuperAdmin;
// DELETE /api/super-admin/users/:id (role 0) — nunca apagar a si mesmo
const deleteSuperAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (Number(id) === Number(req.userId)) {
            return res.status(400).json({ success: false, message: "Não pode eliminar a sua própria conta." });
        }
        yield UserModel_1.UserModel.destroy({ where: { id, userRole: 0 } });
        return res.status(200).json({ success: true, message: "Super Admin eliminado." });
    }
    catch (err) {
        console.error("[deleteSuperAdmin]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.deleteSuperAdmin = deleteSuperAdmin;
// ══════════════════════════════════════════════════════════
// PLANOS DE SUBSCRIÇÃO
// ══════════════════════════════════════════════════════════
// GET /api/subscription-plans — PÚBLICO (landing + registo)
// ?is_active=1 filtra apenas planos activos
const listPlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { is_active } = req.query;
        let sql = "SELECT * FROM subscription_plans";
        const replacements = [];
        if (is_active === "1" || is_active === "true") {
            sql += " WHERE is_active = 1";
        }
        sql += " ORDER BY price_mzn ASC";
        const [rows] = yield db_1.db.query(sql, { replacements });
        return res.status(200).json({ success: true, result: rows });
    }
    catch (err) {
        console.error("[listPlans]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.listPlans = listPlans;
// POST /api/super-admin/plans (role 0) — criar plano
const createPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, slug, price_mzn, max_clients, features, is_popular, is_active } = req.body || {};
        if (!name || !slug || price_mzn == null || max_clients == null) {
            return res.status(400).json({
                success: false,
                message: "Campos obrigatórios: name, slug, price_mzn e max_clients.",
            });
        }
        yield db_1.db.query(`INSERT INTO subscription_plans (name, slug, price_mzn, max_clients, features, is_popular, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`, {
            replacements: [
                name,
                String(slug).toLowerCase(),
                Number(price_mzn),
                Number(max_clients),
                JSON.stringify(features || []),
                is_popular ? 1 : 0,
                is_active === false ? 0 : 1,
            ],
        });
        return res.status(201).json({ success: true, message: "Plano criado com sucesso." });
    }
    catch (err) {
        console.error("[createPlan]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.createPlan = createPlan;
// PUT /api/super-admin/plans/:id (role 0) — editar plano
const updatePlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, slug, price_mzn, max_clients, features, is_popular, is_active } = req.body || {};
        yield db_1.db.query(`UPDATE subscription_plans SET
         name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         price_mzn = COALESCE(?, price_mzn),
         max_clients = COALESCE(?, max_clients),
         features = COALESCE(?, features),
         is_popular = COALESCE(?, is_popular),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`, {
            replacements: [
                name !== null && name !== void 0 ? name : null,
                slug ? String(slug).toLowerCase() : null,
                price_mzn != null ? Number(price_mzn) : null,
                max_clients != null ? Number(max_clients) : null,
                features != null ? JSON.stringify(features) : null,
                is_popular != null ? (is_popular ? 1 : 0) : null,
                is_active != null ? (is_active ? 1 : 0) : null,
                id,
            ],
        });
        return res.status(200).json({ success: true, message: "Plano actualizado." });
    }
    catch (err) {
        console.error("[updatePlan]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.updatePlan = updatePlan;
// DELETE /api/super-admin/plans/:id (role 0) — desactivar (soft) em vez de apagar
const deactivatePlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.db.query("UPDATE subscription_plans SET is_active = 0 WHERE id = ?", { replacements: [id] });
        return res.status(200).json({ success: true, message: "Plano desactivado." });
    }
    catch (err) {
        console.error("[deactivatePlan]", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.deactivatePlan = deactivatePlan;
