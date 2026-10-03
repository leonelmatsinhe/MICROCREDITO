import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { QueryTypes, Transaction } from "sequelize";
import { db } from "../database/db";
import { ReporteBMMapperService } from "./ReporteBMMapperService";

export const MICRO_SECTORS = ["Comércio", "Agricultura", "Pecuária", "Indústria", "Serviços", "Consumo", "Outros"] as const;
export const PAYMENT_METHODS = ["M-Pesa", "BCI", "eMola", "Dinheiro"] as const;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (n: any) => Number(n || 0);
const VALID_SEX = ["Homem", "Mulher", "Outro"];
const VALID_FUNDING = ["Proprio", "Alheio_Nacional", "Alheio_Estrangeiro"];
const VALID_CATEGORIES = ["Emprestimo", "Donativo", "Aumento_Capital"];
const VALID_ASSETS = ["Caixa", "Bancos", "Outros_Activos"];

const selects = async (sql: string, replacements: any[] = [], transaction?: Transaction): Promise<any[]> =>
  db.query(sql, { replacements, type: QueryTypes.SELECT, transaction }) as unknown as Promise<any[]>;
const execute = (sql: string, replacements: any[] = [], transaction?: Transaction) =>
  db.query(sql, { replacements, transaction });

export const riskClassForDays = (days: number): "I" | "II" | "III" | "IV" | null => {
  if (days <= 0) return null;
  if (days <= 30) return "I";
  if (days <= 90) return "II";
  if (days <= 365) return "III";
  return "IV";
};

const validDate = (value: any) => {
  const match = String(value || "").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
};
const requireDateRange = (start: any, end: any) => {
  if (!validDate(start) || !validDate(end) || String(start) > String(end)) throw new Error("Indique um período válido (AAAA-MM-DD).");
};
const requireThreeMonthPeriod = (start: string, end: string) => {
  requireDateRange(start, end);
  const first = new Date(`${start}T00:00:00Z`), last = new Date(`${end}T00:00:00Z`);
  const monthSpan = (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth();
  if (monthSpan !== 2 || first.getUTCDate() !== 1 || last.getUTCDate() !== new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0)).getUTCDate()) throw new Error("O reporte trimestral deve abranger exactamente três meses civis completos.");
};
export const validateQuarterRange = (start: string, end: string) => {
  try { requireThreeMonthPeriod(start, end); return true; } catch { return false; }
};
const addMonths = (date: string, months: number) => {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
};

const updateLoanSnapshot = async (tenantId: number, creditId: number, transaction: Transaction, asOf = new Date().toISOString().slice(0, 10)) => {
  const loans = await selects("SELECT id, estado, capital_em_divida, juro_em_divida FROM creditos WHERE tenant_id = ? AND id = ? FOR UPDATE", [tenantId, creditId], transaction);
  if (!loans[0]) throw new Error("Crédito não encontrado.");
  if (loans[0].estado === "Abatido") return;
  const installments = await selects("SELECT data_vencimento, capital_previsto, juro_previsto, capital_pago, juro_pago, estado FROM pagamentos_credito WHERE tenant_id = ? AND credito_id = ? ORDER BY numero_prestacao", [tenantId, creditId], transaction);
  let principal = 0, interest = 0, daysLate = 0;
  for (const part of installments) {
    principal += Math.max(0, num(part.capital_previsto) - num(part.capital_pago));
    interest += Math.max(0, num(part.juro_previsto) - num(part.juro_pago));
    if (String(part.data_vencimento) < asOf && part.estado !== "Pago") {
      const due = new Date(`${String(part.data_vencimento).slice(0, 10)}T00:00:00Z`);
      const today = new Date(`${asOf}T00:00:00Z`);
      daysLate = Math.max(daysLate, Math.floor((today.getTime() - due.getTime()) / 86400000));
    }
  }
  principal = round2(principal); interest = round2(interest);
  const status = principal + interest <= 0 ? "Reembolsado" : daysLate > 0 ? "Em_Risco" : "Vigente";
  await execute("UPDATE creditos SET capital_em_divida = ?, juro_em_divida = ?, total_em_divida = ?, dias_atraso = ?, classe_risco = ?, estado = ? WHERE tenant_id = ? AND id = ?", [principal, interest, round2(principal + interest), daysLate, riskClassForDays(daysLate), status, tenantId, creditId], transaction);
};

export const listClients = (tenantId: number) => ReporteBMMapperService.listCustomers(tenantId);
export const saveClient = async (tenantId: number, userId: number, body: any, id?: number) => {
  if (!String(body.nome || "").trim()) throw new Error("O nome do cliente é obrigatório.");
  const sex = VALID_SEX.includes(body.sexo) ? body.sexo : "Outro";
  const fields = [String(body.nome).trim(), body.tipo_doc || null, body.numero_doc || null, validDate(body.data_nascimento) ? body.data_nascimento : null, sex, body.telefone || null, body.email || null, body.endereco || null, body.provincia || null, body.distrito || null, body.bairro || null, MICRO_SECTORS.includes(body.sector_actividade) ? body.sector_actividade : "Outros", body.estado === "Inactivo" ? "Inactivo" : "Activo"];
  if (id) {
    const [result]: any = await db.query("UPDATE clientes_microcredito SET nome=?,tipo_doc=?,numero_doc=?,data_nascimento=?,sexo=?,telefone=?,email=?,endereco=?,provincia=?,distrito=?,bairro=?,sector_actividade=?,estado=? WHERE tenant_id=? AND id=?", { replacements: [...fields, tenantId, id] });
    if (!result.affectedRows) throw new Error("Cliente não encontrado.");
    return (await selects("SELECT * FROM clientes_microcredito WHERE tenant_id=? AND id=?", [tenantId, id]))[0];
  }
  const [result]: any = await db.query("INSERT INTO clientes_microcredito (tenant_id,nome,tipo_doc,numero_doc,data_nascimento,sexo,telefone,email,endereco,provincia,distrito,bairro,sector_actividade,estado,criado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", { replacements: [tenantId, ...fields, userId] });
  return (await selects("SELECT * FROM clientes_microcredito WHERE tenant_id=? AND id=?", [tenantId, result.insertId]))[0];
};
export const deleteClient = async (tenantId: number, id: number) => {
  const [result]: any = await db.query("DELETE FROM clientes_microcredito WHERE tenant_id=? AND id=? AND NOT EXISTS (SELECT 1 FROM creditos WHERE creditos.tenant_id=? AND creditos.cliente_id=clientes_microcredito.id)", { replacements: [tenantId, id, tenantId] });
  if (!result.affectedRows) throw new Error("Cliente inexistente ou com créditos associados; não pode ser removido.");
};

export const listCredits = (tenantId: number) => ReporteBMMapperService.listCredits(tenantId);
export const createCredit = async (tenantId: number, userId: number, body: any) => {
  const principal = num(body.montante_capital), rate = num(body.taxa_juro_mensal), months = Number(body.prazo_meses), issued = String(body.data_concessao || "");
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isInteger(months) || months < 1 || months > 120 || !validDate(issued)) throw new Error("Dados do crédito inválidos.");
  const sector = MICRO_SECTORS.includes(body.sector_finalidade) ? body.sector_finalidade : "Outros";
  const customer = (await selects("SELECT id FROM clientes_microcredito WHERE tenant_id=? AND id=? AND estado='Activo'", [tenantId, Number(body.cliente_id)]))[0];
  if (!customer) throw new Error("Cliente não encontrado ou inactivo nesta empresa.");
  const t = await db.transaction();
  try {
    const temporaryCode = `PENDING-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const schedule: any[] = [];
    const monthlyPayment = rate === 0 ? principal / months : principal * (rate / 100) / (1 - Math.pow(1 + rate / 100, -months));
    let balance = principal, totalInterest = 0;
    for (let n = 1; n <= months; n++) {
      const interest = round2(balance * rate / 100);
      const capital = n === months ? round2(balance) : Math.min(round2(balance), round2(monthlyPayment - interest));
      const total = round2(capital + interest);
      totalInterest = round2(totalInterest + interest);
      balance = round2(Math.max(0, balance - capital));
      schedule.push({ numero: n, due: addMonths(issued, n), capital, interest, total });
    }
    const due = schedule[schedule.length - 1].due;
    const [res]: any = await db.query("INSERT INTO creditos (tenant_id,cliente_id,codigo,montante_capital,taxa_juro_mensal,prazo_meses,data_concessao,data_vencimento,sector_finalidade,estado,capital_em_divida,juro_em_divida,total_em_divida,juros_total,agente_id) VALUES (?,?,?,?,?,?,?,?,?,'Vigente',?,?,?, ?,?)", { replacements: [tenantId, customer.id, temporaryCode, round2(principal), rate, months, issued, due, sector, round2(principal), totalInterest, round2(principal + totalInterest), totalInterest, userId], transaction: t });
    const creditId = Number(res.insertId);
    const code = `MC-${new Date(issued).getUTCFullYear()}-${String(creditId).padStart(5, "0")}`;
    await execute("UPDATE creditos SET codigo=? WHERE tenant_id=? AND id=?", [code, tenantId, creditId], t);
    for (const part of schedule) await execute("INSERT INTO pagamentos_credito (tenant_id,credito_id,numero_prestacao,data_vencimento,capital_previsto,juro_previsto,total_previsto,estado) VALUES (?,?,?,?,?,?,?,'Pendente')", [tenantId, creditId, part.numero, part.due, part.capital, part.interest, part.total], t);
    await t.commit();
    return { ...(await selects("SELECT * FROM creditos WHERE tenant_id=? AND id=?", [tenantId, creditId]))[0], prestacoes: schedule };
  } catch (error) { await t.rollback(); throw error; }
};

export const listPayments = (tenantId: number) => ReporteBMMapperService.listPayments(tenantId);
export const postPayment = async (tenantId: number, userId: number, creditId: number, body: any) => {
  const amount = round2(num(body.montante));
  const date = String(body.data_pagamento || new Date().toISOString().slice(0, 10));
  if (!(amount > 0) || !validDate(date) || !(PAYMENT_METHODS as readonly string[]).includes(body.forma)) throw new Error("Valor, data ou forma de pagamento inválidos.");
  const t = await db.transaction();
  try {
    const loan = (await selects("SELECT id, estado FROM creditos WHERE tenant_id=? AND id=? FOR UPDATE", [tenantId, creditId], t))[0];
    if (!loan || loan.estado === "Abatido") throw new Error("Crédito não encontrado ou abatido.");
    const installments = await selects("SELECT * FROM pagamentos_credito WHERE tenant_id=? AND credito_id=? AND estado <> 'Pago' ORDER BY data_vencimento,numero_prestacao FOR UPDATE", [tenantId, creditId], t);
    let left = amount;
    for (const part of installments) {
      if (left <= 0) break;
      const interestDue = round2(num(part.juro_previsto) - num(part.juro_pago));
      const capitalDue = round2(num(part.capital_previsto) - num(part.capital_pago));
      const interestPaid = round2(Math.min(left, Math.max(0, interestDue))); left = round2(left - interestPaid);
      const capitalPaid = round2(Math.min(left, Math.max(0, capitalDue))); left = round2(left - capitalPaid);
      if (!(interestPaid || capitalPaid)) continue;
      const newInterest = round2(num(part.juro_pago) + interestPaid), newCapital = round2(num(part.capital_pago) + capitalPaid);
      const isPaid = newInterest + 0.00001 >= num(part.juro_previsto) && newCapital + 0.00001 >= num(part.capital_previsto);
      const lateDays = date > String(part.data_vencimento).slice(0, 10) ? Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${String(part.data_vencimento).slice(0, 10)}T00:00:00Z`)) / 86400000) : 0;
      await execute("UPDATE pagamentos_credito SET capital_pago=?,juro_pago=?,total_pago=?,data_pagamento=?,forma=?,estado=?,dias_atraso=? WHERE tenant_id=? AND id=?", [newCapital, newInterest, round2(newCapital + newInterest), date, body.forma, isPaid ? "Pago" : "Parcial", lateDays, tenantId, part.id], t);
      await execute("INSERT INTO microcredit_payment_events (tenant_id,credito_id,prestacao_id,data_pagamento,capital_pago,juro_pago,forma,registado_por) VALUES (?,?,?,?,?,?,?,?)", [tenantId, creditId, part.id, date, capitalPaid, interestPaid, body.forma, userId], t);
    }
    if (left > 0.01) throw new Error("O valor do pagamento excede o saldo total por pagar.");
    await execute("UPDATE creditos SET data_ultimo_pagamento=? WHERE tenant_id=? AND id=?", [date, tenantId, creditId], t);
    await updateLoanSnapshot(tenantId, creditId, t);
    await t.commit();
    return (await selects("SELECT * FROM creditos WHERE tenant_id=? AND id=?", [tenantId, creditId]))[0];
  } catch (error) { await t.rollback(); throw error; }
};

export const listFunding = (tenantId: number) => ReporteBMMapperService.listFunding(tenantId);
export const saveFunding = async (tenantId: number, body: any, id?: number) => {
  if (!VALID_FUNDING.includes(body.tipo) || !String(body.descricao || "").trim() || !(num(body.montante) > 0) || !validDate(body.data_entrada)) throw new Error("Dados do financiamento inválidos.");
  const category = VALID_CATEGORIES.includes(body.categoria_periodo) ? body.categoria_periodo : null;
  if (id) {
    const [r]: any = await db.query("UPDATE fontes_financiamento SET tipo=?,descricao=?,montante=?,data_entrada=?,origem=?,categoria_periodo=? WHERE tenant_id=? AND id=?", { replacements: [body.tipo, String(body.descricao).trim(), round2(num(body.montante)), body.data_entrada, body.origem || null, category, tenantId, id] });
    if (!r.affectedRows) throw new Error("Financiamento não encontrado.");
    return (await selects("SELECT * FROM fontes_financiamento WHERE tenant_id=? AND id=?", [tenantId, id]))[0];
  }
  const [r]: any = await db.query("INSERT INTO fontes_financiamento (tenant_id,tipo,descricao,montante,data_entrada,origem,categoria_periodo) VALUES (?,?,?,?,?,?,?)", { replacements: [tenantId, body.tipo, String(body.descricao).trim(), round2(num(body.montante)), body.data_entrada, body.origem || null, category] });
  return (await selects("SELECT * FROM fontes_financiamento WHERE tenant_id=? AND id=?", [tenantId, r.insertId]))[0];
};
export const deleteFunding = async (tenantId: number, id: number) => {
  const [r]: any = await db.query("DELETE FROM fontes_financiamento WHERE tenant_id=? AND id=?", { replacements: [tenantId, id] });
  if (!r.affectedRows) throw new Error("Financiamento não encontrado.");
};
export const saveMovement = async (tenantId: number, body: any, id?: number) => {
  const month = Number(body.mes);
  if (!VALID_ASSETS.includes(body.tipo) || !Number.isInteger(month) || month < 1 || month > 3 || !validDate(body.data) || !Number.isFinite(num(body.montante))) throw new Error("Dados de movimento inválidos.");
  if (id) {
    const [r]: any = await db.query("UPDATE movimentos_financeiros_operador SET tipo=?,mes=?,data=?,montante=? WHERE tenant_id=? AND id=?", { replacements: [body.tipo, month, body.data, num(body.montante), tenantId, id] });
    if (!r.affectedRows) throw new Error("Movimento não encontrado.");
    return (await selects("SELECT * FROM movimentos_financeiros_operador WHERE tenant_id=? AND id=?", [tenantId, id]))[0];
  }
  const [r]: any = await db.query("INSERT INTO movimentos_financeiros_operador (tenant_id,tipo,mes,data,montante) VALUES (?,?,?,?,?)", { replacements: [tenantId, body.tipo, month, body.data, num(body.montante)] });
  return (await selects("SELECT * FROM movimentos_financeiros_operador WHERE tenant_id=? AND id=?", [tenantId, r.insertId]))[0];
};
export const listMovements = (tenantId: number, start?: string, end?: string) => ReporteBMMapperService.listMovements(tenantId, start, end);
export const readConfig = (tenantId: number) => ReporteBMMapperService.getCoreCreditRanges(tenantId);
export const saveConfig = async (tenantId: number, body: any) => {
  const minRate = num(body.taxa_juro_min), maxRate = num(body.taxa_juro_max), minTerm = Number(body.prazo_min), maxTerm = Number(body.prazo_max);
  if (minRate < 0 || maxRate < minRate || !Number.isInteger(minTerm) || !Number.isInteger(maxTerm) || minTerm < 1 || maxTerm < minTerm || num(body.capital_inicial) < 0 || num(body.capital_actual) < 0) throw new Error("Configuração de taxas/prazos/capital inválida.");
  await execute("INSERT INTO config_microcredito (tenant_id,taxa_juro_min,taxa_juro_max,prazo_min,prazo_max,capital_inicial,capital_actual) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE taxa_juro_min=VALUES(taxa_juro_min),taxa_juro_max=VALUES(taxa_juro_max),prazo_min=VALUES(prazo_min),prazo_max=VALUES(prazo_max),capital_inicial=VALUES(capital_inicial),capital_actual=VALUES(capital_actual)", [tenantId, minRate, maxRate, minTerm, maxTerm, num(body.capital_inicial), num(body.capital_actual)]);
  return readConfig(tenantId);
};

const reportData = async (tenantId: number, start: string, end: string) => {
  requireThreeMonthPeriod(start, end);
  const [company] = await selects("SELECT c.*, p.name AS provincia_nome, (SELECT COUNT(*) FROM users u WHERE u.companyId=c.id AND u.userRole IN (1,2,3) AND u.status=1 AND u.is_active=1) AS trabalhadores FROM companies c LEFT JOIN provinces p ON p.id=c.provinceId WHERE c.id=?", [tenantId]);
  if (!company) throw new Error("Empresa do utilizador não encontrada.");
  const loans = await selects("SELECT * FROM creditos WHERE tenant_id=? AND data_concessao<=? ORDER BY id", [tenantId, end]);
  const loanIds = loans.map((l: any) => Number(l.id));
  let parts: any[] = [], events: any[] = [];
  if (loanIds.length) {
    const placeholders = loanIds.map(() => "?").join(",");
    parts = await selects(`SELECT * FROM pagamentos_credito WHERE tenant_id=? AND credito_id IN (${placeholders}) ORDER BY credito_id,numero_prestacao`, [tenantId, ...loanIds]);
    events = await selects(`SELECT credito_id,prestacao_id,data_pagamento,capital_pago,juro_pago FROM microcredit_payment_events WHERE tenant_id=? AND credito_id IN (${placeholders}) AND data_pagamento BETWEEN ? AND ?`, [tenantId, ...loanIds, start, end]);
  }
  const paidAtEndRows = loanIds.length ? await selects(`SELECT prestacao_id,COALESCE(SUM(capital_pago),0) AS cap,COALESCE(SUM(juro_pago),0) AS intr FROM microcredit_payment_events WHERE tenant_id=? AND credito_id IN (${loanIds.map(() => "?").join(",")}) AND data_pagamento<=? GROUP BY prestacao_id`, [tenantId, ...loanIds, end]) : [];
  const paidAtEnd = new Map<number, { cap: number; int: number }>(paidAtEndRows.map((r: any) => [Number(r.prestacao_id), { cap: num(r.cap), int: num(r.intr) }]));
  const clientIds = [...new Set(loans.map((loan: any) => Number(loan.cliente_id)))];
  const clientRows = clientIds.length ? await selects(`SELECT id,sexo,nome FROM clientes_microcredito WHERE tenant_id=? AND id IN (${clientIds.map(() => "?").join(",")})`, [tenantId, ...clientIds]) : [];
  const clientsById = new Map(clientRows.map((client: any) => [Number(client.id), client]));
  const paymentByPart = new Map<number, { cap: number; int: number }>();
  const paidTotals = { cap: 0, int: 0 };
  for (const event of events) { const k = Number(event.prestacao_id); const old = paymentByPart.get(k) || { cap: 0, int: 0 }; old.cap += num(event.capital_pago); old.int += num(event.juro_pago); paymentByPart.set(k, old); paidTotals.cap += num(event.capital_pago); paidTotals.int += num(event.juro_pago); }
  const partsByLoan = new Map<number, any[]>();
  for (const part of parts) { const list = partsByLoan.get(Number(part.credito_id)) || []; list.push(part); partsByLoan.set(Number(part.credito_id), list); }
  const riskTotals: Record<string, { capital: number; interest: number }> = { I: { capital: 0, interest: 0 }, II: { capital: 0, interest: 0 }, III: { capital: 0, interest: 0 }, IV: { capital: 0, interest: 0 } };
  let activeCapital = 0, activeInterest = 0, riskCapital = 0, riskInterest = 0, writtenOffCapital = 0, writtenOffInterest = 0;
  const activeClientIds = new Set<number>();
  const activeSex: Record<string, Set<number>> = { Homem: new Set(), Mulher: new Set(), Outro: new Set() };
  const periodLoans = loans.filter((l: any) => String(l.data_concessao).slice(0, 10) >= start && String(l.data_concessao).slice(0, 10) <= end);
  const bySector = Object.fromEntries(MICRO_SECTORS.map((s) => [s, 0])) as Record<string, number>;
  for (const loan of loans) {
    const loanParts = partsByLoan.get(Number(loan.id)) || [];
    let outstandingCapital = 0, outstandingInterest = 0, maxLate = 0;
    for (const part of loanParts) {
      const paidAtEndForPart = paidAtEnd.get(Number(part.id));
      const paidCap = num(paidAtEndForPart?.cap), paidIntr = num(paidAtEndForPart?.int);
      const remCap = Math.max(0, num(part.capital_previsto) - paidCap), remIntr = Math.max(0, num(part.juro_previsto) - paidIntr);
      outstandingCapital += remCap; outstandingInterest += remIntr;
      if (String(part.data_vencimento).slice(0, 10) < end && remCap + remIntr > 0) maxLate = Math.max(maxLate, Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${String(part.data_vencimento).slice(0, 10)}T00:00:00Z`)) / 86400000));
    }
    outstandingCapital = round2(outstandingCapital); outstandingInterest = round2(outstandingInterest);
    loan._capital_asof = outstandingCapital; loan._interest_asof = outstandingInterest; loan._days_late_asof = maxLate;
    if (loan.estado === "Abatido" && loan.data_abatimento && String(loan.data_abatimento).slice(0, 10) <= end) {
      writtenOffCapital += num(loan.capital_abatido); writtenOffInterest += num(loan.juro_abatido); continue;
    }
    if (outstandingCapital + outstandingInterest <= 0.009) continue;
    activeCapital += outstandingCapital; activeInterest += outstandingInterest;
    if (maxLate > 0) {
      riskCapital += outstandingCapital; riskInterest += outstandingInterest;
      const cls = riskClassForDays(maxLate)!;
      riskTotals[cls].capital += outstandingCapital; riskTotals[cls].interest += outstandingInterest;
    }
    const client = clientsById.get(Number(loan.cliente_id));
    if (client) { activeClientIds.add(Number(client.id)); activeSex[VALID_SEX.includes(client.sexo) ? client.sexo : "Outro"].add(Number(client.id)); }
  }
  for (const loan of periodLoans) bySector[MICRO_SECTORS.includes(loan.sector_finalidade) ? loan.sector_finalidade : "Outros"] += num(loan.montante_capital);
  const repaidCreditIds = new Set<number>();
  for (const loan of loans) {
    const loanParts = partsByLoan.get(Number(loan.id)) || [];
    const remains = loanParts.reduce((sum: number, part: any) => {
      const paid = paidAtEnd.get(Number(part.id));
      return sum + Math.max(0, num(part.capital_previsto) - num(paid?.cap)) + Math.max(0, num(part.juro_previsto) - num(paid?.int));
    }, 0);
    if (loanParts.length && remains <= 0.009 && events.some((event: any) => Number(event.credito_id) === Number(loan.id))) repaidCreditIds.add(Number(loan.id));
  }
  const funded = await selects("SELECT * FROM fontes_financiamento WHERE tenant_id=? AND data_entrada BETWEEN ? AND ?", [tenantId, start, end]);
  const sources = await selects("SELECT tipo,COALESCE(SUM(montante),0) AS total FROM fontes_financiamento WHERE tenant_id=? GROUP BY tipo", [tenantId]);
  const funding = { Proprio: 0, Alheio_Nacional: 0, Alheio_Estrangeiro: 0 };
  sources.forEach((r: any) => { if (r.tipo in funding) funding[r.tipo as keyof typeof funding] = num(r.total); });
  const fundingPeriod = { Emprestimo: 0, Donativo: 0, Aumento_Capital: 0 };
  funded.forEach((r: any) => { if (r.categoria_periodo && r.categoria_periodo in fundingPeriod) fundingPeriod[r.categoria_periodo as keyof typeof fundingPeriod] += num(r.montante); else if (r.tipo !== "Proprio") fundingPeriod.Emprestimo += num(r.montante); });
  const config = await readConfig(tenantId);
  const movementRows = await selects("SELECT tipo,YEAR(data) AS year_num,MONTH(data) AS month_num,COALESCE(SUM(montante),0) AS total FROM movimentos_financeiros_operador WHERE tenant_id=? AND data BETWEEN ? AND ? GROUP BY tipo,YEAR(data),MONTH(data)", [tenantId, start, end]);
  const months: string[] = [];
  const startMonth = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < 3; i++) { const d = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1)); months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`); }
  const assets: Record<string, number[]> = { Caixa: [0,0,0], Bancos: [0,0,0], Outros_Activos: [0,0,0] };
  movementRows.forEach((r: any) => { const key = months.indexOf(`${r.year_num}-${String(r.month_num).padStart(2,"0")}`); const asset = r.tipo as keyof typeof assets; if (key >= 0 && assets[asset]) assets[asset][key] += num(r.total); });
  const activeRates = loans.filter((l: any) => Number(l._capital_asof || 0) + Number(l._interest_asof || 0) > 0.009 && !(l.estado === "Abatido" && l.data_abatimento && String(l.data_abatimento).slice(0, 10) <= end));
  const rates = activeRates.map((l: any) => num(l.taxa_juro_mensal));
  const terms = activeRates.map((l: any) => Number(l.prazo_meses));
  const overdue = loans.filter((l: any) => Number(l._days_late_asof) > 0 && !(l.estado === "Abatido" && l.data_abatimento && String(l.data_abatimento).slice(0, 10) <= end)).map((l: any) => ({ id: l.id, codigo: l.codigo, cliente_nome: clientsById.get(Number(l.cliente_id))?.nome || "", dias_atraso: l._days_late_asof, total_em_divida: round2(num(l._capital_asof) + num(l._interest_asof)), classe_risco: riskClassForDays(Number(l._days_late_asof)) }));
  const result = {
    tenant: { id: tenantId, name: company.companyName, address: company.companyAddress || "", province: company.provincia_nome || "", phone: company.companyPhone || company.phone || "", email: company.companyEmail || company.email || "", nuit: company.companyNuit || company.nuit || "", workers: num(company.trabalhadores), startDate: company.created_at || company.createdAt || "" },
    period: { start, end, months },
    volume: { granted: { capital: round2(periodLoans.reduce((s: number,l:any)=>s+num(l.montante_capital),0)), interest: round2(periodLoans.reduce((s:number,l:any)=>s+num(l.juros_total),0)) }, repaid: { capital: round2(paidTotals.cap), interest: round2(paidTotals.int) }, writtenOff: { capital: round2(writtenOffCapital), interest: round2(writtenOffInterest) }, active: { capital: round2(activeCapital), interest: round2(activeInterest) }, risk: { capital: round2(riskCapital), interest: round2(riskInterest) } },
    loanCounts: { granted: periodLoans.length, repaid: repaidCreditIds.size },
    sectors: bySector,
    clients: { men: activeSex.Homem.size, women: activeSex.Mulher.size, other: activeSex.Outro.size, total: activeClientIds.size },
    riskClasses: riskTotals,
    rates: { min: rates.length ? Math.min(...rates) : 0, max: rates.length ? Math.max(...rates) : 0, termMin: terms.length ? Math.min(...terms) : 0, termMax: terms.length ? Math.max(...terms) : 0 },
    funding: { sources: funding, period: fundingPeriod },
    capital: { initial: num(config.capital_inicial), current: num(config.capital_actual) },
    assets: { cash: assets.Caixa, banks: assets.Bancos, other: assets.Outros_Activos },
    overdue,
  };
  return result;
};

export const getTenantMetadata = (tenantId: number, operator: string) => ReporteBMMapperService.getTenantMetadata(tenantId, operator);

export const writeOffCredit = async (tenantId: number, creditId: number, date: string) => {
  if (!validDate(date)) throw new Error("Data de abate inválida.");
  const t = await db.transaction();
  try {
    const [credit] = await selects("SELECT estado FROM creditos WHERE tenant_id=? AND id=? FOR UPDATE", [tenantId, creditId], t);
    if (!credit || credit.estado === "Abatido") throw new Error("Crédito inexistente ou já abatido.");
    const installments = await selects("SELECT id,capital_previsto,juro_previsto FROM pagamentos_credito WHERE tenant_id=? AND credito_id=?", [tenantId, creditId], t);
    const parts = installments.map((part: any) => Number(part.id));
    const paid = parts.length ? await selects(`SELECT COALESCE(SUM(capital_pago),0) AS capital,COALESCE(SUM(juro_pago),0) AS interest FROM microcredit_payment_events WHERE tenant_id=? AND credito_id=? AND prestacao_id IN (${parts.map(() => "?").join(",")}) AND data_pagamento<=?`, [tenantId, creditId, ...parts, date], t) : [];
    const remainingCapital = round2(installments.reduce((sum: number, part: any) => sum + num(part.capital_previsto), 0) - num(paid[0]?.capital));
    const remainingInterest = round2(installments.reduce((sum: number, part: any) => sum + num(part.juro_previsto), 0) - num(paid[0]?.interest));
    if (remainingCapital + remainingInterest <= 0) throw new Error("Um crédito sem saldo não pode ser abatido.");
    await execute("UPDATE creditos SET estado='Abatido',capital_em_divida=?,juro_em_divida=?,total_em_divida=?,capital_abatido=?,juro_abatido=?,data_abatimento=? WHERE tenant_id=? AND id=?", [remainingCapital, remainingInterest, round2(remainingCapital + remainingInterest), remainingCapital, remainingInterest, date, tenantId, creditId], t);
    await t.commit();
    return (await selects("SELECT * FROM creditos WHERE tenant_id=? AND id=?", [tenantId, creditId]))[0];
  } catch (error) { await t.rollback(); throw error; }
};

export const getDashboard = async (tenantId: number) => {
  return ReporteBMMapperService.getDashboard(tenantId);
  /* Legacy implementation retained below for compatibility reference only; the parallel tables are no longer a report/dashboard source.
  const creditsToRefresh = await selects("SELECT id FROM creditos WHERE tenant_id=? AND estado <> 'Abatido'", [tenantId]);
  const t = await db.transaction();
  try { for (const credit of creditsToRefresh) await updateLoanSnapshot(tenantId, Number(credit.id), t); await t.commit(); }
  catch (error) { await t.rollback(); throw error; }
  const credits = await selects("SELECT c.*,cl.nome AS cliente_nome,cl.sexo FROM creditos c JOIN clientes_microcredito cl ON cl.id=c.cliente_id AND cl.tenant_id=c.tenant_id WHERE c.tenant_id=? ORDER BY c.id DESC", [tenantId]);
  const active = credits.filter((l: any) => ["Vigente", "Em_Risco", "Atrasado"].includes(l.estado));
  const portfolio = active.reduce((s: number, l: any) => s + num(l.total_em_divida), 0);
  const risk = active.filter((l: any) => num(l.dias_atraso) > 0).reduce((s: number, l: any) => s + num(l.total_em_divida), 0);
  const sectors = Object.fromEntries(MICRO_SECTORS.map(s => [s, credits.filter((l: any) => l.sector_finalidade === s).reduce((sum: number, l: any) => sum + num(l.montante_capital), 0)]));
  const classes: Record<string, number> = { I: 0, II: 0, III: 0, IV: 0 };
  for (const l of active) { const c = riskClassForDays(num(l.dias_atraso)); if (c) classes[c] += num(l.total_em_divida); }
  const clients = await selects("SELECT COUNT(*) AS total FROM clientes_microcredito WHERE tenant_id=? AND estado='Activo' AND id IN (SELECT cliente_id FROM creditos WHERE tenant_id=? AND estado IN ('Vigente','Em_Risco','Atrasado'))", [tenantId, tenantId]);
  const lateCredits = active.filter((l: any) => num(l.dias_atraso) > 0).slice(0, 15);
  const overdueIds = [...new Set(lateCredits.map((loan: any) => Number(loan.cliente_id)))];
  const overdueNames = overdueIds.length ? await selects(`SELECT id,nome FROM clientes_microcredito WHERE tenant_id=? AND id IN (${overdueIds.map(() => "?").join(",")})`, [tenantId, ...overdueIds]) : [];
  const nameById = new Map(overdueNames.map((row: any) => [Number(row.id), row.nome]));
  const overdue = lateCredits.map((loan: any) => ({ ...loan, cliente_nome: nameById.get(Number(loan.cliente_id)) || "", classe_risco: riskClassForDays(Number(loan.dias_atraso)) }));
  return { portfolio: round2(portfolio), riskAmount: round2(risk), riskPercent: portfolio ? round2(risk * 100 / portfolio) : 0, activeClients: num(clients[0]?.total), activeCredits: active.length, sectors, riskClasses: classes, overdue };
  */
};

export const getQuarterlyReport = async (tenantId: number, userName: string, start: string, end: string) =>
  ReporteBMMapperService.getQuarterlyReport(tenantId, userName, start, end);

const formatDate = (date: string) => { const [y,m,d] = date.split("-"); return `${d}/${m}/${y}`; };
const money = (v: any) => round2(num(v));
const setText = (sheet: ExcelJS.Worksheet, address: string, label: string, value: any) => { sheet.getCell(address).value = `${label}${value === undefined || value === null ? "" : ` ${value}`}`; };
export const buildQuarterlyWorkbook = async (report: any) => {
  const isCompiled = __dirname.includes(`${path.sep}build${path.sep}`);
  const root = isCompiled ? path.resolve(__dirname, "..", "..", "..") : path.resolve(__dirname, "..", "..");
  const template = path.join(root, "templates", "MODELO_DE_REPORTE_TRIMESTRAL_2025_III.xlsx");
  if (!fs.existsSync(template)) throw new Error("O modelo XLSX trimestral do Banco de Moçambique não está instalado.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(template);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("O modelo XLSX não contém folhas.");
  const t = report.tenant, v = report.volume;
  const format = (n: number) => round2(num(n));
  sheet.getCell("B8").value = `DATA: ${formatDate(report.period.start)} à ${formatDate(report.period.end)} (DD/MM/AAAA)`;
  setText(sheet, "A12", "Denominação: ", t.name);
  setText(sheet, "A13", "Endereço: ", t.address);
  setText(sheet, "A14", "Província: ", t.province);
  setText(sheet, "A15", "Telefone: ", t.phone);
  setText(sheet, "A16", "Fax: ________________________________ E-mail: ", t.email);
  setText(sheet, "A17", "Nº de Trabalhadores: ", t.workers);
  setText(sheet, "A18", "Data de Início das Actividades: ", t.startDate ? formatDate(String(t.startDate).slice(0, 10)) : "");
  setText(sheet, "A19", "Nome do Operador: ", report.operator);
  for (const [row, data] of [[26, v.granted], [27, v.repaid], [28, v.writtenOff], [29, v.active], [30, v.risk]] as any[]) {
    sheet.getCell(`C${row}`).value = format(data.capital); sheet.getCell(`D${row}`).value = format(data.interest); sheet.getCell(`E${row}`).value = format(data.capital + data.interest);
  }
  sheet.getCell("E34").value = report.loanCounts.granted;
  sheet.getCell("E35").value = report.loanCounts.repaid;
  MICRO_SECTORS.forEach((sector, i) => { sheet.getCell(`E${41+i}`).value = format(report.sectors[sector]); });
  sheet.getCell("E48").value = format(Object.values(report.sectors).reduce((sum: number, n: any) => sum + num(n), 0));
  sheet.getCell("E54").value = report.clients.men; sheet.getCell("E55").value = report.clients.women; sheet.getCell("E56").value = report.clients.other; sheet.getCell("E57").value = report.clients.total;
  ["I", "II", "III", "IV"].forEach((risk, i) => { const row = 62+i, item = report.riskClasses[risk]; sheet.getCell(`C${row}`).value = format(item.capital); sheet.getCell(`D${row}`).value = format(item.interest); sheet.getCell(`E${row}`).value = format(item.capital + item.interest); });
  sheet.getCell("C66").value = format(Object.values(report.riskClasses).reduce((sum: number, item: any) => sum + item.capital, 0));
  sheet.getCell("D66").value = format(Object.values(report.riskClasses).reduce((sum: number, item: any) => sum + item.interest, 0)); sheet.getCell("E66").value = format(sheet.getCell("C66").value as number + (sheet.getCell("D66").value as number));
  sheet.getCell("D71").value = report.rates.min; sheet.getCell("E71").value = report.rates.max; sheet.getCell("D72").value = report.rates.termMin; sheet.getCell("E72").value = report.rates.termMax;
  sheet.getCell("C76").value = format(report.funding.sources.Proprio); sheet.getCell("C78").value = format(report.funding.sources.Alheio_Nacional); sheet.getCell("C79").value = format(report.funding.sources.Alheio_Estrangeiro);
  sheet.getCell("C80").value = format(report.funding.sources.Proprio + report.funding.sources.Alheio_Nacional + report.funding.sources.Alheio_Estrangeiro);
  sheet.getCell("C84").value = format(report.funding.period.Emprestimo); sheet.getCell("C85").value = format(report.funding.period.Donativo); sheet.getCell("C86").value = format(report.funding.period.Aumento_Capital);
  sheet.getCell("C87").value = format(report.funding.period.Emprestimo + report.funding.period.Donativo + report.funding.period.Aumento_Capital);
  sheet.getCell("C91").value = format(report.capital.initial); sheet.getCell("C92").value = format(report.capital.current);
  for (let i=0;i<3;i++) { sheet.getCell(`C${97+i}`).value = format(report.assets.cash[i]); sheet.getCell(`D${97+i}`).value = format(report.assets.banks[i]); sheet.getCell(`E${97+i}`).value = format(report.assets.other[i]); }
  for (let i=0;i<3;i++) { const [year,month]=report.period.months[i].split("-"); sheet.getCell(`${String.fromCharCode(67+i)}96`).value=`Mês ${i+1} (${month}/${year})`; }
  if (Array.isArray(report.dataWarnings) && report.dataWarnings.length) {
    const quality = workbook.addWorksheet("Qualidade dos dados");
    quality.addRow(["Avisos de mapeamento BM", "Período", `${report.period.start} — ${report.period.end}`]);
    quality.addRow(["Campo", "Estado", "Observação"]);
    report.dataWarnings.forEach((warning: string) => quality.addRow(["Dados não mapeados / ressalvas", "Revisão necessária", warning]));
    quality.columns = [{ width: 36 }, { width: 24 }, { width: 110 }];
    quality.getRow(1).font = { bold: true };
    quality.getRow(2).font = { bold: true };
  }
  return { buffer: await workbook.xlsx.writeBuffer(), worksheet: sheet.name };
};
export const toReportFileSlug = (name: string) => String(name || "empresa").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "empresa";
