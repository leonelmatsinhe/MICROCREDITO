import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

/**
 * TENANT GUARD — ISOLAMENTO SINGLE-TENANT
 * =======================================
 * Cada instalação serve UMA só empresa (instalação dedicada on-premise/VPS).
 * Quando TENANT_MODE=single, o `companyId` que vem do cliente deixa de ser
 * confiado: é sempre substituído por SINGLE_TENANT_COMPANY_ID (omissão: 1).
 *
 * O que faz, por pedido:
 *   1. req.query.companyId  — parâmetros de query (?companyId=2)
 *   2. req.body.companyId   — corpo JSON/form (mesmo que o body-parser corra
 *                             depois, o valor é corrigido na atribuição)
 *   3. req.params.companyId — parâmetro de rota (/api/loans/overview/:companyId)
 *
 * As três propriedades ficam "seladas" com um acessor próprio no request: se
 * algum middleware posterior voltar a atribuir req.body/req.params/req.query
 * (o router do Express reatribui req.params em cada camada, e o body-parser
 * atribui req.body), o companyId é corrigido outra vez na entrada.
 *
 * Qualquer tentativa de forjar outro tenant (ex.: token da empresa 1 com
 * companyId=2 na URL) gera um WARNING no log com o id recebido, o id forçado,
 * o companyId do token e a rota — a resposta continua a ser a da empresa única.
 *
 * Sem TENANT_MODE=single o middleware é inerte (next() imediato): o modo
 * multi-empresa continua a funcionar como antes.
 */

/** Valor forçado quando SINGLE_TENANT_COMPANY_ID não está definido. */
const DEFAULT_SINGLE_TENANT_COMPANY_ID = 1;

/** Lê o id da empresa única da instalação (SINGLE_TENANT_COMPANY_ID, omissão 1). */
export const getSingleTenantCompanyId = (): number => {
  const raw = String(process.env.SINGLE_TENANT_COMPANY_ID ?? "").trim();
  if (!raw) return DEFAULT_SINGLE_TENANT_COMPANY_ID;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SINGLE_TENANT_COMPANY_ID;
};

/** True quando a instalação está em modo de empresa única. */
export const isSingleTenantMode = (): boolean =>
  String(process.env.TENANT_MODE ?? "").trim().toLowerCase() === "single";

/** companyId presente no token (apenas para o log — a validação é do middleware auth). */
const decodedTokenCompanyId = (req: Request): string | null => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (!token || scheme.toLowerCase() !== "bearer") return null;
    const decoded: any = jwt.decode(token);
    const id = decoded && typeof decoded === "object" ? decoded.companyId : undefined;
    return id === undefined || id === null ? null : String(id);
  } catch {
    // Token indecifrável: irrelevante aqui — o middleware auth trata da validade.
    return null;
  }
};

const warnForge = (
  req: Request,
  source: string,
  attempted: unknown,
  forced: number,
  tokenCompanyId: string | null
) => {
  console.warn(
    `[TenantGuard] AVISO DE SEGURANÇA: tentativa de forja/acesso cross-tenant em ${source} ` +
      `(recebido '${String(attempted)}', forçado para '${forced}')` +
      `${tokenCompanyId ? ` [companyId do token: ${tokenCompanyId}]` : ""}` +
      ` — ${req.method} ${req.originalUrl || req.url}`
  );
};

/**
 * Substitui o companyId do contentor (query/body/params) pelo da empresa única.
 * Preserva o tipo do valor original (number vs string) para não surpreender
 * comparações estritas feitas nos controladores.
 */
const forceCompanyId = (
  container: any,
  forced: number,
  source: string,
  req: Request,
  tokenCompanyId: string | null
): any => {
  if (!container || typeof container !== "object") return container;

  const current = container.companyId;
  if (current !== undefined && current !== null && String(current) !== String(forced)) {
    warnForge(req, source, current, forced, tokenCompanyId);
  }

  container.companyId = typeof current === "number" ? forced : String(forced);
  return container;
};

/**
 * Sela uma propriedade do request (query/body/params) para que o companyId
 * esteja sempre forçado — na leitura actual e em qualquer atribuição futura.
 */
const lockTenantProperty = (
  req: Request,
  key: "query" | "body" | "params",
  forced: number,
  tokenCompanyId: string | null
) => {
  const source = `req.${key}.companyId`;
  let current = forceCompanyId((req as any)[key], forced, source, req, tokenCompanyId);

  try {
    Object.defineProperty(req, key, {
      configurable: true,
      enumerable: true,
      get() {
        return current;
      },
      set(next: any) {
        current = forceCompanyId(next, forced, source, req, tokenCompanyId);
      },
    });
  } catch {
    // Ambiente que não permita redefinir a propriedade: fica a correcção directa.
  }
};

export const tenantGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!isSingleTenantMode()) return next();

  const forced = getSingleTenantCompanyId();
  const tokenCompanyId = decodedTokenCompanyId(req);

  lockTenantProperty(req, "query", forced, tokenCompanyId);
  lockTenantProperty(req, "body", forced, tokenCompanyId);
  lockTenantProperty(req, "params", forced, tokenCompanyId);

  // Conveniência para controladores/serviços que prefiram ler do contexto.
  (req as any).companyId = forced;
  res.locals.companyId = forced;

  next();
};
