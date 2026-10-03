import { Request, Response } from "express";
import { getCurrentUser } from "../middlewares/roles";
import {
  buildQuarterlyWorkbook,
  createCredit,
  deleteClient,
  deleteFunding,
  getDashboard,
  getQuarterlyReport,
  getTenantMetadata,
  listClients,
  listCredits,
  listFunding,
  listMovements,
  listPayments,
  postPayment,
  readConfig,
  saveClient,
  saveConfig,
  saveFunding,
  saveMovement,
  writeOffCredit,
  toReportFileSlug,
} from "../services/microcreditService";
import { ReporteBMMapperService } from "../services/ReporteBMMapperService";

const context = (req: Request) => {
  const user = getCurrentUser(req);
  const tenantId = Number(user?.companyId);
  const userId = Number(user?.id);
  if (!Number.isInteger(tenantId) || tenantId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    throw new Error("Utilizador sem empresa associada. Contacte o administrador do sistema.");
  }
  return { tenantId, userId, userName: String(user?.name || "") };
};

const handler = (action: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try {
    await action(req, res);
  } catch (error: any) {
    const message = error?.message || "Erro interno no módulo de microcrédito.";
    return res.status(/não encontrado|não pode|inválid|obrigatóri|excede|inactivo|associada/i.test(message) ? 400 : 500).json({ success: false, message });
  }
};

export const dashboard = handler(async (req, res) => res.json({ success: true, result: await getDashboard(context(req).tenantId) }));
export const clients = handler(async (req, res) => res.json({ success: true, result: await listClients(context(req).tenantId) }));
const legacyWriteDisabled = (_req: Request, res: Response) => res.status(410).json({ success: false, message: "Escrita desactivada para impedir dados paralelos. Use o módulo core correspondente." });
export const createClient = legacyWriteDisabled;
export const updateClient = legacyWriteDisabled;
export const removeClient = legacyWriteDisabled;
export const credits = handler(async (req, res) => res.json({ success: true, result: await listCredits(context(req).tenantId) }));
export const createMicrocredit = legacyWriteDisabled;
export const writeOff = legacyWriteDisabled;
export const tenantMetadata = handler(async (req, res) => { const c = context(req); return res.json({ success: true, result: await getTenantMetadata(c.tenantId, c.userName) }); });
export const payments = handler(async (req, res) => res.json({ success: true, result: await listPayments(context(req).tenantId) }));
export const registerPayment = legacyWriteDisabled;
export const funding = handler(async (req, res) => res.json({ success: true, result: await listFunding(context(req).tenantId) }));
export const createFunding = legacyWriteDisabled;
export const updateFunding = legacyWriteDisabled;
export const removeFunding = legacyWriteDisabled;
export const movements = handler(async (req, res) => res.json({ success: true, result: await listMovements(context(req).tenantId, req.query.dataInicio as string, req.query.dataFim as string) }));
export const createMovement = legacyWriteDisabled;
export const updateMovement = legacyWriteDisabled;
export const config = handler(async (req, res) => res.json({ success: true, result: await readConfig(context(req).tenantId) }));
export const previewReport = handler(async (req, res) => {
  const c = context(req); const { dataInicio, dataFim } = req.query as any;
  const [result, tenant] = await Promise.all([
    getQuarterlyReport(c.tenantId, c.userName, String(dataInicio || ""), String(dataFim || "")),
    getTenantMetadata(c.tenantId, c.userName),
  ]);
  result.tenant = tenant;
  return res.json({ success: true, result });
});
export const generateReport = handler(async (req, res) => {
  const c = context(req); const { dataInicio, dataFim } = req.body || {};
  const [report, tenant] = await Promise.all([
    getQuarterlyReport(c.tenantId, c.userName, String(dataInicio || ""), String(dataFim || "")),
    getTenantMetadata(c.tenantId, c.userName),
  ]);
  report.tenant = tenant;
  const workbook = await buildQuarterlyWorkbook(report);
  await ReporteBMMapperService.logReportGeneration({ userId: c.userId, companyId: c.tenantId, ip: req.ip || String(req.headers["x-forwarded-for"] || ""), start: report.period.start, end: report.period.end, name: report.tenant.name });
  const periodEnd = new Date(`${report.period.end}T00:00:00Z`);
  const quarter = Math.floor(periodEnd.getUTCMonth() / 3) + 1;
  const filename = `BM_Reporte_${toReportFileSlug(report.tenant.name)}_${periodEnd.getUTCFullYear()}-T${quarter}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  return res.status(200).send(workbook.buffer);
});
