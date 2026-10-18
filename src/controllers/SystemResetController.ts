import { Request, Response } from "express";
import {
  previewReset,
  runOperationalReset,
  verifyAdminPassword,
  SystemResetError,
  RESET_TABLES,
  KEPT_TABLES,
  ZEROED_TABLES,
} from "../services/systemResetService";
import { isSingleTenantMode, getSingleTenantCompanyId } from "../middlewares/tenantGuard";
import { getCurrentUser } from "../middlewares/roles";

/**
 * ADMINISTRAÇÃO DO SISTEMA — RESET GERAL DE DADOS OPERACIONAIS
 * ===========================================================
 * Duas rotas, ambas atrás de `isAdmin` (só Admin/Operador) e do `tenantGuard`
 * global de src/app.ts:
 *
 *   GET  /api/admin/system/reset-status   → preview (contagens por tabela)
 *   POST /api/admin/system/reset-operational-data → executa o reset
 *
 * O reset SÓ funciona em instalação single-tenant (TENANT_MODE=single com
 * SINGLE_TENANT_DEFINED): numa instalação multi-empresa apagar "tudo" apagaria
 * dados de outras empresas, por isso a rota responde 403 em modo multi.
 *
 * O backend NÃO confia no frontend: além do `isAdmin`, exige
 *   1. a palavra-confirmação exacta "RESETAR" (anti-clique acidental); e
 *   2. a senha do Admin logado (bcrypt.compare em verifyAdminPassword).
 */

const clientIpOf = (req: Request): string | null => {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd) || req.ip || "";
  const str = String(ip).split(",")[0].trim();
  return str ? str.slice(0, 60) : null;
};

/** Guard: a instalação está em modo single-tenant COM empresa explícita? */
const requireSingleTenant = (req: Request, res: Response): boolean => {
  const companyIdDefined = String(process.env.SINGLE_TENANT_COMPANY_ID ?? "").trim();
  if (isSingleTenantMode() && companyIdDefined) return true;
  res.status(403).json({
    success: false,
    code: "NOT_SINGLE_TENANT",
    message:
      "O Reset Geral só está disponível em instalações single-tenant (TENANT_MODE=single e SINGLE_TENANT_COMPANY_ID definido).",
  });
  return false;
};

/** Só o Administrador (userRole 1) — nem o Super Admin (0) nem o Operador (2). */
const requireAdminRole = (req: Request, res: Response): any | null => {
  const user = getCurrentUser(req);
  if (!user || Number(user.userRole) !== 1) {
    res.status(403).json({
      success: false,
      code: "FORBIDDEN",
      message: "Apenas o Administrador pode executar o Reset Geral de dados.",
    });
    return null;
  }
  return user;
};

const resetStatus = async (req: Request, res: Response) => {
  if (!requireSingleTenant(req, res)) return;
  if (!requireAdminRole(req, res)) return;
  try {
    const preview = await previewReset();
    return res.status(200).send({
      success: true,
      result: {
        ...preview,
        companyId: getSingleTenantCompanyId(),
        confirmWord: "RESETAR",
      },
    });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error?.message || "Erro ao preparar o reset.",
    });
  }
};

const resetOperationalData = async (req: Request, res: Response) => {
  if (!requireSingleTenant(req, res)) return;
  const user = requireAdminRole(req, res);
  if (!user) return;
  try {
    const { confirmWord, password } = req.body || {};

    // Camada 2 — a palavra exacta "RESETAR" (o frontend já exige, o backend
    // valida de novo: nunca se confia no cliente).
    if (String(confirmWord ?? "").trim().toUpperCase() !== "RESETAR") {
      return res.status(400).json({
        success: false,
        code: "CONFIRM_WORD_INVALID",
        message: 'Confirmação inválida: deve escrever exatamente "RESETAR".',
      });
    }

    // Camada 3 — senha do Admin logado (bcrypt.compare).
    const validPassword = await verifyAdminPassword(user, String(password ?? ""));
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        code: "PASSWORD_INVALID",
        message: "Senha do Administrador incorreta. O reset NÃO foi executado.",
      });
    }

    // Camadas 1 + 4 — backup SQL prévio e registo em audit_log (ambos feitos
    // dentro de runOperationalReset: o backup ANTES de apagar, o audit_log
    // dentro da mesma transação do purge).
    const result = await runOperationalReset({
      id: Number(user.id),
      name: String(user.name || user.email || "Admin"),
      email: user.email,
      companyId: Number(user.companyId),
      ip: clientIpOf(req),
    });

    return res.status(200).json({
      success: true,
      message:
        "Sistema resetado com sucesso — os recibos iniciarão do nº 1. Volte a iniciar sessão.",
      result: {
        deleted: result.deleted,
        totalDeleted: result.totalDeleted,
        backupPath: result.backupPath,
        tablesCleared: RESET_TABLES.length,
        tablesKept: KEPT_TABLES.map((t) => t.table),
        tablesZeroed: ZEROED_TABLES.map((t) => t.table),
      },
    });
  } catch (error: any) {
    if (error instanceof SystemResetError) {
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    console.error("[SystemReset] Erro no reset geral:", error?.stack || error);
    return res.status(500).json({
      success: false,
      code: "RESET_FAILED",
      message:
        "O reset falhou e foi anulado (ROLLBACK). Nenhum dado foi alterado. Detalhe: " +
        (error?.message || "erro desconhecido"),
    });
  }
};

export { resetStatus, resetOperationalData };
