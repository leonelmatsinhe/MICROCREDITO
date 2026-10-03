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
export const createClient = handler(async (req, res) => res.status(201).json({ success: true, result: await saveClient(context(req).tenantId, context(req).userId, req.body || {}) }));
export const updateClient = handler(async (req, res) => res.json({ success: true, result: await saveClient(context(req).tenantId, context(req).userId, req.body || {}, Number(req.params.id)) }));
export const removeClient = handler(async (req, res) => { await deleteClient(context(req).tenantId, Number(req.params.id)); return res.json({ success: true }); });
export const credits = handler(async (req, res) => res.json({ success: true, result: await listCredits(context(req).tenantId) }));
export const createMicrocredit = handler(async (req, res) => { const c = context(req); return res.status(201).json({ success: true, result: await createCredit(c.tenantId, c.userId, req.body || {}) }); });
export const writeOff = handler(async (req, res) => { const c = context(req); return res.json({ success: true, result: await writeOffCredit(c.tenantId, Number(req.params.creditId), String(req.body?.data_abatimento || "")) }); });
export const tenantMetadata = handler(async (req, res) => { const c = context(req); return res.json({ success: true, result: await getTenantMetadata(c.tenantId, c.userName) }); });
export const payments = handler(async (req, res) => res.json({ success: true, result: await listPayments(context(req).tenantId) }));
export const registerPayment = handler(async (req, res) => { const c = context(req); return res.status(201).json({ success: true, result: await postPayment(c.tenantId, c.userId, Number(req.params.creditId), req.body || {}) }); });
export const funding = handler(async (req, res) => res.json({ success: true, result: await listFunding(context(req).tenantId) }));
export const createFunding = handler(async (req, res) => res.status(201).json({ success: true, result: await saveFunding(context(req).tenantId, req.body || {}) }));
export const updateFunding = handler(async (req, res) => res.json({ success: true, result: await saveFunding(context(req).tenantId, req.body || {}, Number(req.params.id)) }));
export const removeFunding = handler(async (req, res) => { await deleteFunding(context(req).tenantId, Number(req.params.id)); return res.json({ success: true }); });
export const movements = handler(async (req, res) => res.json({ success: true, result: await listMovements(context(req).tenantId, req.query.dataInicio as string, req.query.dataFim as string) }));
export const createMovement = handler(async (req, res) => res.status(201).json({ success: true, result: await saveMovement(context(req).tenantId, req.body || {}) }));
export const updateMovement = handler(async (req, res) => res.json({ success: true, result: await saveMovement(context(req).tenantId, req.body || {}, Number(req.params.id)) }));
export const config = handler(async (req, res) => {
  const tenantId = context(req).tenantId;
  if (req.method === "GET") return res.json({ success: true, result: await readConfig(tenantId) });
  return res.json({ success: true, result: await saveConfig(tenantId, req.body || {}) });
});
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
