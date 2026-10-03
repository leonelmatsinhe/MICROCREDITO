import { QueryTypes } from "sequelize";
import { db } from "../database/db";
import { installmentPanification } from "../utils/calculateLateAmount";
import { AuditLogModel } from "../database/models/paymentsV2Models";
const MICRO_SECTORS = ["Comércio", "Agricultura", "Pecuária", "Indústria", "Serviços", "Consumo", "Outros"] as const;
export const riskClassForDays = (days: number): "I" | "II" | "III" | "IV" | null => days <= 0 ? null : days <= 30 ? "I" : days <= 90 ? "II" : days <= 365 ? "III" : "IV";
const validateQuarterRange = (start: string, end: string): boolean => {
  const validDate = (value: string) => {
    const parts = value.split("-").map(Number);
    if (value.length !== 10 || parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return false;
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(start) || !validDate(end) || start > end) return false;
  const first = new Date(`${start}T00:00:00Z`), last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || first.toISOString().slice(0, 10) !== start || last.toISOString().slice(0, 10) !== end) return false;
  return (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth() === 2 && first.getUTCDate() === 1 && last.getUTCDate() === new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0)).getUTCDate();
};

export const validateBmQuarterRange = validateQuarterRange;

const round2 = (value: any): number => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const number = (value: any): number => Number.isFinite(Number(value)) ? Number(value) : 0;
const dateKey = (value: any): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
export const normalizeBmSex = (value: any): "Homem" | "Mulher" | "Outro" => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["m", "masculino", "homem", "male", "1"].includes(normalized)) return "Homem";
  if (["f", "feminino", "mulher", "female", "2"].includes(normalized)) return "Mulher";
  return "Outro";
};

/** Conservative conversion: never interprets a missing/unknown profession as a specific BM sector. */
export const resolveBmSector = (value: any): typeof MICRO_SECTORS[number] => {
  const text = String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!text) return "Outros";
  if (/pecuar|gado|criacao de animais|avicultur/.test(text)) return "Pecuária";
  if (/agric|cultivo|agronom|horticultur|silvicultur/.test(text)) return "Agricultura";
  if (/industri|fabric|transformacao|producao/.test(text)) return "Indústria";
  if (/comerc|venda|loja|retalho|grossista|mercado/.test(text)) return "Comércio";
  if (/consum|despesa pessoal|uso pessoal/.test(text)) return "Consumo";
  if (/servic|transporte|educacao|saude|construcao|restaur|hotel|oficina/.test(text)) return "Serviços";
  return "Outros";
};

const select = async (sql: string, replacements: any[] = []): Promise<any[]> =>
  db.query(sql, { replacements, type: QueryTypes.SELECT }) as unknown as Promise<any[]>;

type Allocation = { capital: number; interest: number; late: number; penalty: number };
type InstallmentState = { installment: any; paid: Allocation; fallbackPaid?: number };
type LoanState = { loan: any; installments: InstallmentState[]; capital: number; interest: number; lateDays: number; sector: string; sex: string };

const emptyRisk = () => ({ I: { capital: 0, interest: 0 }, II: { capital: 0, interest: 0 }, III: { capital: 0, interest: 0 }, IV: { capital: 0, interest: 0 } });

/**
 * Read-only adapter over the business tables. `companyId` must be sourced from
 * the authenticated user by the caller, never from request query/body values.
 */
export class ReporteBMMapperService {
  static async getTenantMetadata(companyId: number, operator = ""): Promise<any> {
    const [company] = await select(
      "SELECT c.id,c.companyName,c.companyAddress,c.companyPhone,c.companyEmail,c.companyNuit,c.createdAt,c.provinceId,p.name AS province_name,(SELECT COUNT(*) FROM users u WHERE u.companyId=c.id AND u.userRole IN (1,2,3) AND u.status=1 AND u.is_active=1) AS workers FROM companies c LEFT JOIN provinces p ON p.id=c.provinceId WHERE c.id=?",
      [companyId]
    );
    if (!company) throw new Error("Empresa do utilizador não encontrada.");
    return {
      id: Number(company.id), name: company.companyName || "", address: company.companyAddress || "",
      province: company.province_name || "", phone: company.companyPhone || "", email: company.companyEmail || "",
      nuit: company.companyNuit || "", workers: number(company.workers), startDate: company.createdAt || "", operator,
    };
  }

  private static async loadCore(companyId: number, start: string, end: string): Promise<any> {
    const tenant = await this.getTenantMetadata(companyId);
    const loans = await select(
      "SELECT l.id,l.companyId,l.customerId,l.accountNumber,l.amount,l.interestRate,l.numberOfInstallments,l.dateCreated,l.disbursementDate,l.status,l.loanDescription,l.borrowerInfo,l.walletId,c.customerName,c.sex,c.customerProfession,c.companyMainActivity,(SELECT MIN(a.dueDate) FROM amortization_loans a WHERE a.companyId=l.companyId AND a.loanId=l.id) AS first_due_date FROM customer_loans l LEFT JOIN customers c ON c.id=l.customerId AND c.companyId=l.companyId WHERE l.companyId=? AND l.status IN (1,3) AND COALESCE(l.disbursementDate,DATE_SUB((SELECT MIN(a.dueDate) FROM amortization_loans a WHERE a.companyId=l.companyId AND a.loanId=l.id), INTERVAL 1 MONTH),'1900-01-01')<=? ORDER BY l.id",
      [companyId, end]
    );
    const loanIds = loans.map((row: any) => Number(row.id));
    let installments: any[] = [], payments: any[] = [], allocations: any[] = [];
    if (loanIds.length) {
      const marks = loanIds.map(() => "?").join(",");
      installments = await select(`SELECT id,companyId,loanId,customerId,amortization,rateAmount,installment,dueDate,status,paidAmount,remainingBalance FROM amortization_loans WHERE companyId=? AND loanId IN (${marks}) ORDER BY loanId,dueDate,id`, [companyId, ...loanIds]);
      payments = await select(`SELECT id,loanId,amortizationLoanId,paymentDate,amount,interestRateAmount,latePaymentInterest,mora_amount,discountAmount,status FROM tranzactions WHERE companyId=? AND loanId IN (${marks}) AND paymentDate<=CURDATE() AND COALESCE(status,'CONFIRMED')='CONFIRMED' ORDER BY paymentDate,id`, [companyId, ...loanIds]);
      if (payments.length) {
        const paymentIds = payments.map((row: any) => Number(row.id));
        allocations = await select(`SELECT pa.payment_id,pa.amortization_loan_id,pa.component,pa.amount FROM payment_allocations pa INNER JOIN tranzactions t ON t.id=pa.payment_id AND t.companyId=? WHERE pa.payment_id IN (${paymentIds.map(() => "?").join(",")}) AND COALESCE(t.status,'CONFIRMED')='CONFIRMED'`, [companyId, ...paymentIds]);
      }
    }
    const allocationsByPayment = new Map<number, Allocation>();
    const periodAllocationsByPayment = new Map<number, Allocation>();
    const allocationByInstallment = new Map<number, Allocation>();
    const paymentById = new Map<number, any>();
    payments.forEach((tx: any) => paymentById.set(Number(tx.id), tx));
    for (const row of allocations) {
      const part: Allocation = allocationsByPayment.get(Number(row.payment_id)) || { capital: 0, interest: 0, late: 0, penalty: 0 };
      const amount = number(row.amount), component = String(row.component).toUpperCase();
      if (component === "CAPITAL") part.capital += amount;
      else if (component === "INTEREST") part.interest += amount;
      else if (component === "LATE_INTEREST") part.late += amount;
      else if (component === "PENALTY") part.penalty += amount;
      allocationsByPayment.set(Number(row.payment_id), part);
      const tx = paymentById.get(Number(row.payment_id));
      if (tx && dateKey(tx.paymentDate) >= start && dateKey(tx.paymentDate) <= end) {
        const periodPart: Allocation = periodAllocationsByPayment.get(Number(row.payment_id)) || { capital: 0, interest: 0, late: 0, penalty: 0 };
        if (component === "CAPITAL") periodPart.capital += amount;
        else if (component === "INTEREST") periodPart.interest += amount;
        else if (component === "LATE_INTEREST") periodPart.late += amount;
        else if (component === "PENALTY") periodPart.penalty += amount;
        periodAllocationsByPayment.set(Number(row.payment_id), periodPart);
      }
      if (tx && dateKey(tx.paymentDate) <= end) {
        const installmentPart: Allocation = allocationByInstallment.get(Number(row.amortization_loan_id)) || { capital: 0, interest: 0, late: 0, penalty: 0 };
        if (component === "CAPITAL") installmentPart.capital += amount;
        else if (component === "INTEREST") installmentPart.interest += amount;
        else if (component === "LATE_INTEREST") installmentPart.late += amount;
        else if (component === "PENALTY") installmentPart.penalty += amount;
        allocationByInstallment.set(Number(row.amortization_loan_id), installmentPart);
      }
    }

    // Legacy payments without payment_allocations are apportioned interest-first,
    // matching the core payment waterfall; reversed payments were filtered above.
    const legacyPaid = new Map<number, Allocation>();
    for (const tx of payments) {
      if (dateKey(tx.paymentDate) > end || allocationsByPayment.has(Number(tx.id))) continue;
      const id = Number(tx.amortizationLoanId);
      const legacy = legacyPaid.get(id) || { capital: 0, interest: 0, late: 0, penalty: 0 };
      const installment = installments.find((row: any) => Number(row.id) === id);
      const interestDue = Math.max(0, number(installment?.rateAmount) - legacy.interest);
      const total = Math.max(0, number(tx.amount));
      const interest = Math.min(total, interestDue);
      legacy.interest += interest;
      legacy.capital += Math.max(0, total - interest);
      legacy.late += Math.max(0, number(tx.latePaymentInterest) || number(tx.mora_amount));
      legacyPaid.set(id, legacy);
    }
    const partsByLoan = new Map<number, InstallmentState[]>();
    for (const installment of installments) {
      const id = Number(installment.id);
      const actualAllocation = allocationByInstallment.get(id);
      const legacy = legacyPaid.get(id);
      const paid = actualAllocation || legacy || { capital: 0, interest: 0, late: 0, penalty: 0 };
      const txs = payments.filter((tx: any) => Number(tx.amortizationLoanId) === id && dateKey(tx.paymentDate) <= end);
      const hasLaterPayment = payments.some((tx: any) => Number(tx.amortizationLoanId) === id && dateKey(tx.paymentDate) > end);
      const fallbackPaid = actualAllocation || txs.length || hasLaterPayment ? undefined : number(installment.paidAmount);
      const list = partsByLoan.get(Number(installment.loanId)) || [];
      list.push({ installment, paid, fallbackPaid });
      partsByLoan.set(Number(installment.loanId), list);
    }

    const [companyPolicy] = await select("SELECT forfeit FROM companies WHERE id=?", [companyId]);
    const states: LoanState[] = loans.map((loan: any) => {
      const parts = partsByLoan.get(Number(loan.id)) || [];
      const historicalPlan = parts.map((part) => {
        const row = part.installment;
        let paidCapital = part.paid.capital, paidInterest = part.paid.interest;
        if (part.fallbackPaid !== undefined && Number(row.status) === 1) { paidCapital = number(row.amortization); paidInterest = number(row.rateAmount); }
        else if (part.fallbackPaid !== undefined && part.fallbackPaid > 0) { paidInterest = Math.min(number(row.rateAmount), part.fallbackPaid); paidCapital = Math.max(0, part.fallbackPaid - paidInterest); }
        const fullyPaid = number(row.amortization) - paidCapital + number(row.rateAmount) - paidInterest <= 0.009;
        return { ...row, status: fullyPaid ? 1 : paidCapital + paidInterest > 0 ? -1 : 0, paidAmount: paidCapital + paidInterest };
      });
      const calculatedLate: any[] = installmentPanification(historicalPlan, number(companyPolicy?.forfeit), end);
      const lateDaysById = new Map<number, number>(calculatedLate.map((part: any) => [Number(part.id), number(part.lateDays)]));
      let capital = 0, interest = 0, lateDays = 0;
      for (const part of parts) {
        const row = part.installment;
        let paidCapital = part.paid.capital, paidInterest = part.paid.interest;
        // Historical rows may only have amortization status/paidAmount, no transactions.
        if (part.fallbackPaid !== undefined && Number(row.status) === 1) {
          paidCapital = number(row.amortization); paidInterest = number(row.rateAmount);
        } else if (part.fallbackPaid !== undefined && part.fallbackPaid > 0) {
          const total = part.fallbackPaid;
          paidInterest = Math.min(number(row.rateAmount), total);
          paidCapital = Math.max(0, total - paidInterest);
        }
        const remainingCapital = Math.max(0, number(row.amortization) - paidCapital);
        const remainingInterest = Math.max(0, number(row.rateAmount) - paidInterest);
        capital += remainingCapital;
        interest += remainingInterest;
        if (remainingCapital + remainingInterest > 0.009) lateDays = Math.max(lateDays, lateDaysById.get(Number(row.id)) || 0);
      }
      const purpose = loan.customerProfession || loan.companyMainActivity || loan.loanDescription || "";
      return { loan, installments: parts, capital: round2(capital), interest: round2(interest), lateDays, sector: resolveBmSector(purpose), sex: normalizeBmSex(loan.sex) };
    });
    const periodStates = states.filter((state) => {
      const raw = state.loan.disbursementDate || (state.loan.first_due_date ? dateKey(state.loan.first_due_date) : state.loan.dateCreated);
      let disbursement = dateKey(raw);
      if (!state.loan.disbursementDate && state.loan.first_due_date) {
        const due = new Date(`${dateKey(state.loan.first_due_date)}T00:00:00Z`);
        due.setUTCMonth(due.getUTCMonth() - 1);
        disbursement = due.toISOString().slice(0, 10);
      }
      state.loan._bmDisbursementDate = disbursement;
      return disbursement >= start && disbursement <= end;
    });
    const periodPayments = payments.filter((tx: any) => dateKey(tx.paymentDate) >= start && dateKey(tx.paymentDate) <= end);
    return { companyId, tenant, start, end, loans: states, periodLoans: periodStates, installments, payments, allocationsByPayment, periodAllocationsByPayment, allocationByInstallment, legacyPaid, periodPayments };
  }

  private static makeReport(core: any): any {
    const sectors: Record<string, number> = Object.fromEntries(MICRO_SECTORS.map((sector) => [sector, 0]));
    const activeClientSex = new Map<number, string>();
    const riskClasses = emptyRisk();
    const active = core.loans.filter((state: LoanState) => state.capital + state.interest > 0.009);
    let activeCapital = 0, activeInterest = 0, riskCapital = 0, riskInterest = 0;
    for (const state of active) {
      activeCapital += state.capital; activeInterest += state.interest;
      sectors[state.sector] += state.capital;
      if (state.loan.customerId) activeClientSex.set(Number(state.loan.customerId), state.sex);
      if (state.lateDays > 0) {
        riskCapital += state.capital; riskInterest += state.interest;
        const risk = riskClassForDays(state.lateDays);
        if (risk) { riskClasses[risk].capital += state.capital; riskClasses[risk].interest += state.interest; }
      }
    }
    let grantedCapital = 0, grantedInterest = 0;
    for (const state of core.periodLoans) {
      grantedCapital += number(state.loan.amount);
      grantedInterest += state.installments.reduce((sum: number, item: InstallmentState) => sum + number(item.installment.rateAmount), 0);
    }
    const paid = { capital: 0, interest: 0 };
    const periodLegacy = new Map<number, Allocation>();
    for (const tx of core.periodPayments) {
      const allocation = core.periodAllocationsByPayment.get(Number(tx.id));
      if (allocation) { paid.capital += allocation.capital; paid.interest += allocation.interest; }
      else {
        const partId = Number(tx.amortizationLoanId);
        const legacy = periodLegacy.get(partId) || { capital: 0, interest: 0, late: 0, penalty: 0 };
        const installment = core.installments.find((row: any) => Number(row.id) === partId);
        const interestRemaining = Math.max(0, number(installment?.rateAmount) - legacy.interest);
        const txInterest = Math.min(number(tx.amount), number(tx.interestRateAmount) || interestRemaining);
        const txCapital = Math.max(0, number(tx.amount) - txInterest);
        legacy.capital += txCapital; legacy.interest += txInterest;
        periodLegacy.set(partId, legacy);
        paid.capital += txCapital; paid.interest += txInterest;
      }
    }
    // No core write-off event/table exists. Zero is paired with a quality warning.
    const periodPaymentIds = new Set(core.periodPayments.map((tx: any) => Number(tx.id)));
    const paidBeforeStart = new Map<number, Allocation>();
    for (const tx of core.payments) {
      if (dateKey(tx.paymentDate) >= core.start) continue;
      const paymentAllocation = core.allocationsByPayment.get(Number(tx.id));
      const partId = Number(tx.amortizationLoanId);
      const old = paidBeforeStart.get(partId) || { capital: 0, interest: 0, late: 0, penalty: 0 };
      if (paymentAllocation) { old.capital += paymentAllocation.capital; old.interest += paymentAllocation.interest; }
      else { old.capital += Math.max(0, number(tx.amount) - number(tx.interestRateAmount)); old.interest += number(tx.interestRateAmount); }
      paidBeforeStart.set(partId, old);
    }
    let repaidCount = 0;
    for (const state of core.loans) {
      const hadOutstandingAtStart = state.installments.some((part: InstallmentState) => {
        const prior = paidBeforeStart.get(Number(part.installment.id)) || { capital: 0, interest: 0, late: 0, penalty: 0 };
        return number(part.installment.amortization) + number(part.installment.rateAmount) > prior.capital + prior.interest + 0.009;
      });
      const repaidInPeriod = state.installments.some((part: InstallmentState) => core.periodPayments.some((tx: any) => Number(tx.amortizationLoanId) === Number(part.installment.id) && periodPaymentIds.has(Number(tx.id))));
      if (state.capital + state.interest <= 0.009 && repaidInPeriod && hadOutstandingAtStart) repaidCount++;
    }
    const rates = active.map((state: LoanState) => number(state.loan.interestRate) * 100);
    const terms = active.map((state: LoanState) => number(state.loan.numberOfInstallments)).filter(Boolean);
    const sectorsTotal = Object.values(sectors).reduce((sum: number, value: number) => sum + value, 0);
    const dataWarnings = [
      "Abates, captações (empréstimos/donativos/aumento de capital) e capital social não têm eventos/tabelas no core; as linhas correspondentes no Excel ficam a zero, não significando ausência financeira.",
      "Carteiras de financiamento são analíticas e não foram usadas como entrada real de fundos.",
      "Outros Activos não têm ledger core classificável e ficam a zero.",
      ...(active.some((state: LoanState) => state.sector === "Outros") ? ["Há actividade/finalidade não classificada automaticamente num sector BM; rever a categoria Outros."] : []),
    ];
    return {
      tenant: core.tenant, period: { start: core.start, end: core.end, months: this.monthKeys(core.start) },
      volume: { granted: { capital: round2(grantedCapital), interest: round2(grantedInterest) }, repaid: { capital: round2(paid.capital), interest: round2(paid.interest) }, writtenOff: { capital: 0, interest: 0 }, active: { capital: round2(activeCapital), interest: round2(activeInterest) }, risk: { capital: round2(riskCapital), interest: round2(riskInterest) } },
      loanCounts: { granted: core.periodLoans.length, repaid: repaidCount }, sectors,
      clients: { men: [...activeClientSex.values()].filter((sex) => sex === "Homem").length, women: [...activeClientSex.values()].filter((sex) => sex === "Mulher").length, other: [...activeClientSex.values()].filter((sex) => sex === "Outro").length, total: activeClientSex.size },
      riskClasses: riskClasses, rates: { min: rates.length ? round2(Math.min(...rates)) : 0, max: rates.length ? round2(Math.max(...rates)) : 0, termMin: terms.length ? Math.min(...terms) : 0, termMax: terms.length ? Math.max(...terms) : 0 },
      funding: { sources: { Proprio: 0, Alheio_Nacional: 0, Alheio_Estrangeiro: 0 }, period: { Emprestimo: 0, Donativo: 0, Aumento_Capital: 0 } },
      capital: { initial: 0, current: 0 }, assets: { cash: [0, 0, 0], banks: [0, 0, 0], other: [0, 0, 0] }, dataWarnings,
      _sectorGrantedTotal: round2(sectorsTotal),
    };
  }

  private static monthKeys(start: string): string[] {
    const first = new Date(`${start}T00:00:00Z`);
    return [0, 1, 2].map((offset) => { const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; });
  }

  static async getQuarterlyReport(companyId: number, operator: string, start: string, end: string): Promise<any> {
    if (!validateQuarterRange(start, end)) throw new Error("O reporte trimestral deve abranger exactamente três meses civis completos.");
    const core = await this.loadCore(companyId, start, end);
    const report = this.makeReport(core);
    const [sources, periodFunding, capital] = await Promise.all([
      this.getFontesFinanciamento(companyId, start, end),
      this.getFinanciamentosPeriodo(companyId, start, end),
      this.getCapital(companyId),
    ]);
    report.funding.sources = sources;
    report.funding.period = periodFunding;
    report.capital = capital;
    report.dataWarnings.push(sources.warning, periodFunding.warning, capital.warning);
    report.operator = operator || "";
    Object.assign(report.tenant, { operator: report.operator });
    report.assets = await this.getSituacaoFinanceira(companyId, start, end);
    report.dataWarnings = [...report.dataWarnings, ...(report.assets.warnings || [])];
    return report;
  }

  static async getVolumeCreditos(companyId: number, start: string, end: string): Promise<any> { return (await this.getQuarterlyReport(companyId, "", start, end)).volume; }
  static async getNumeroCreditos(companyId: number, start: string, end: string): Promise<any> { return (await this.getQuarterlyReport(companyId, "", start, end)).loanCounts; }
  static async getCarteiraPorSector(companyId: number, start: string, end: string): Promise<any> { return (await this.getQuarterlyReport(companyId, "", start, end)).sectors; }
  static async getCarteiraClientes(companyId: number, start: string, end: string): Promise<any> { return (await this.getQuarterlyReport(companyId, "", start, end)).clients; }
  static async getEstruturaRisco(companyId: number, start: string, end: string): Promise<any> { return (await this.getQuarterlyReport(companyId, "", start, end)).riskClasses; }
  static async getTaxasPrazos(companyId: number, start: string, end: string): Promise<any> { return (await this.getQuarterlyReport(companyId, "", start, end)).rates; }
  static async getFontesFinanciamento(_companyId: number, _start?: string, _end?: string): Promise<any> { return { Proprio: 0, Alheio_Nacional: 0, Alheio_Estrangeiro: 0, mapped: false, warning: "Não há evento core de captação nem classificação da origem nacional/estrangeira." }; }
  static async getFinanciamentosPeriodo(_companyId: number, _start: string, _end: string): Promise<any> { return { Emprestimo: 0, Donativo: 0, Aumento_Capital: 0, mapped: false, warning: "Não há evento core de captação classificado como empréstimo, donativo ou aumento de capital." }; }
  static async getCapital(companyId: number): Promise<any> {
    const [company] = await select("SELECT companyName FROM companies WHERE id=?", [companyId]);
    if (!company) throw new Error("Empresa do utilizador não encontrada.");
    return { initial: 0, current: 0, mapped: false, warning: "Capital social/inicial não está registado no core financeiro auditado." };
  }

  static async getSituacaoFinanceira(companyId: number, start: string, end: string): Promise<any> {
    if (!validateQuarterRange(start, end)) throw new Error("Período trimestral inválido.");
    const months = this.monthKeys(start);
    const monthEnds = months.map((month) => { const [year, mon] = month.split("-").map(Number); return new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10); });
    const accounts = await select("SELECT id,type,initial_balance FROM accounts WHERE companyId=? AND is_active=1", [companyId]);
    const txRows = await select("SELECT accountId,balanceAfter,createdAt FROM bank_transactions WHERE companyId=? AND createdAt<=? ORDER BY createdAt,id", [companyId, `${end} 23:59:59`]);
    const bankByAccount = new Map<number, any[]>();
    for (const tx of txRows) { const list = bankByAccount.get(Number(tx.accountId)) || []; list.push(tx); bankByAccount.set(Number(tx.accountId), list); }
    const registers = await select("SELECT id,userId,opening_date,opening_balance,status,closing_balance_calculated,closing_time FROM cash_registers WHERE companyId=? AND opening_date<=? ORDER BY opening_date,id", [companyId, end]);
    const movements = registers.length ? await select(`SELECT cashRegisterId,type,paymentMethod,amount,createdAt FROM cash_movements WHERE companyId=? AND cashRegisterId IN (${registers.map(() => "?").join(",")}) AND createdAt<=?`, [companyId, ...registers.map((r: any) => Number(r.id)), `${end} 23:59:59`]) : [];
    const movementsByRegister = new Map<number, any[]>();
    for (const movement of movements) { const list = movementsByRegister.get(Number(movement.cashRegisterId)) || []; list.push(movement); movementsByRegister.set(Number(movement.cashRegisterId), list); }
    const cash: number[] = [], banks: number[] = [], warnings: string[] = [];
    for (let i = 0; i < 3; i++) {
      const cutoff = monthEnds[i];
      let bankTotal = 0;
      for (const account of accounts) {
        if (String(account.type) !== "BANCO") continue;
        const eligible = (bankByAccount.get(Number(account.id)) || []).filter((tx: any) => dateKey(tx.createdAt) <= cutoff);
        if (eligible.length) bankTotal += number(eligible[eligible.length - 1].balanceAfter);
        else bankTotal += number(account.initial_balance);
      }
      banks.push(round2(bankTotal));
      const latestByUser = new Map<number, any>();
      for (const register of registers) if (dateKey(register.opening_date) <= cutoff) latestByUser.set(Number(register.userId), register);
      let cashTotal = 0;
      for (const register of latestByUser.values()) {
        const closedAtCutoff = String(register.status) === "FECHADO" && register.closing_balance_calculated !== null && (!register.closing_time || dateKey(register.closing_time) <= cutoff);
        if (closedAtCutoff) { cashTotal += number(register.closing_balance_calculated); continue; }
        let balance = number(register.opening_balance);
        for (const movement of movementsByRegister.get(Number(register.id)) || []) {
          if (String(movement.paymentMethod) !== "CASH" || dateKey(movement.createdAt) > cutoff) continue;
          balance += String(movement.type) === "ENTRADA" ? number(movement.amount) : -number(movement.amount);
        }
        cashTotal += balance;
      }
      cash.push(round2(cashTotal));
      if (i === 0 && accounts.some((account: any) => String(account.type) === "BANCO" && !(bankByAccount.get(Number(account.id)) || []).some((tx: any) => dateKey(tx.createdAt) <= cutoff))) warnings.push("Pelo menos uma conta bancária não tem extrato até ao fecho e usa initial_balance como saldo-base.");
    }
    warnings.push("Outros Activos não têm ledger core classificável e ficam a zero; saldos de mobile money/e-wallet não são apresentados como Bancos.");
    return { cash, banks, other: [0, 0, 0], warnings };
  }

  static async listFunding(companyId: number): Promise<any[]> {
    const wallets = await select("SELECT id,codigo,nome,descricao,parceiro_nome,is_parceiro_externo,allocated_amount,initial_disbursed_amount,taxa_juro,is_ativa,created_at FROM financing_wallets WHERE companyId=? ORDER BY nome", [companyId]);
    return wallets.map((wallet: any) => ({
      id: wallet.id, descricao: wallet.nome, nome: wallet.nome, codigo: wallet.codigo,
      tipo: wallet.is_parceiro_externo ? "Carteira analítica · parceiro externo" : "Carteira analítica · interna",
      origem: wallet.parceiro_nome || wallet.descricao || "Fundo interno", montante: number(wallet.allocated_amount) || number(wallet.initial_disbursed_amount),
      allocated_amount: wallet.allocated_amount, initial_disbursed_amount: number(wallet.initial_disbursed_amount), taxa_juro: wallet.taxa_juro,
      data_entrada: wallet.created_at, estado: Number(wallet.is_ativa) ? "Activa" : "Inactiva",
      aviso: "Carteira analítica; não representa uma entrada real de financiamento.",
    }));
  }

  static async listCustomers(companyId: number): Promise<any[]> {
    const rows = await select("SELECT id,accountNumber AS conta,customerName AS nome,sex AS sexo,customerPhone AS telefone,customerEmail AS email,customerAddress AS endereco,customerProfession,companyMainActivity,customerStatus FROM customers WHERE companyId=? ORDER BY customerName", [companyId]);
    return rows.map((row: any) => ({ ...row, sector_actividade: resolveBmSector(row.customerProfession || row.companyMainActivity), estado: Number(row.customerStatus) === 1 ? "Activo" : "Inactivo" }));
  }

  static async listCredits(companyId: number): Promise<any[]> {
    const loans = await select("SELECT l.id,l.customerId,l.accountNumber,l.amount,l.interestRate,l.numberOfInstallments,l.dateCreated,l.disbursementDate,l.status,l.loanDescription,l.borrowerInfo,l.walletId,c.customerName AS cliente_nome,c.sex,c.customerProfession,c.companyMainActivity,(SELECT MIN(a.dueDate) FROM amortization_loans a WHERE a.companyId=l.companyId AND a.loanId=l.id) AS first_due_date FROM customer_loans l LEFT JOIN customers c ON c.id=l.customerId AND c.companyId=l.companyId WHERE l.companyId=? ORDER BY l.id DESC", [companyId]);
    const ids = loans.map((row: any) => Number(row.id));
    const parts = ids.length ? await select(`SELECT id,loanId,amortization,rateAmount,installment,dueDate,status,paidAmount FROM amortization_loans WHERE companyId=? AND loanId IN (${ids.map(() => "?").join(",")}) ORDER BY dueDate,id`, [companyId, ...ids]) : [];
    const balances = new Map<number, number>();
    for (const part of parts) {
      const remaining = Number(part.status) === 1 ? 0 : Math.max(0, number(part.installment) - number(part.paidAmount));
      balances.set(Number(part.loanId), (balances.get(Number(part.loanId)) || 0) + remaining);
    }
    return loans.map((loan: any) => {
      const states: Record<number, string> = { 0: "Pendente", 1: "Vigente", 2: "Rejeitado", 3: "Liquidado", "-1": "Rejeitado" };
      let disbursement = dateKey(loan.disbursementDate) || dateKey(loan.dateCreated);
      if (!loan.disbursementDate && loan.first_due_date) {
        const firstDue = new Date(`${dateKey(loan.first_due_date)}T00:00:00Z`);
        firstDue.setUTCMonth(firstDue.getUTCMonth() - 1);
        disbursement = firstDue.toISOString().slice(0, 10);
      }
      const rate = number(loan.interestRate);
      return { ...loan, codigo: `CR-${loan.id}`, montante_capital: number(loan.amount), taxa_juro_mensal: rate * 100, prazo_meses: number(loan.numberOfInstallments), data_concessao: disbursement, sector_finalidade: resolveBmSector(loan.customerProfession || loan.companyMainActivity || loan.loanDescription), total_em_divida: round2(balances.get(Number(loan.id)) || 0), estado: states[Number(loan.status)] || "Pendente" };
    });
  }

  static async listPayments(companyId: number): Promise<any[]> {
    const payments = await select("SELECT t.id,t.paymentDate AS data_pagamento,t.amount,t.interestRateAmount,t.latePaymentInterest,t.paymentMethod,t.status,l.id AS loanId,CONCAT('CR-',l.id) AS codigo,c.customerName AS cliente_nome,a.installmentOrder AS numero_prestacao FROM tranzactions t JOIN customer_loans l ON l.id=t.loanId AND l.companyId=t.companyId LEFT JOIN customers c ON c.id=l.customerId AND c.companyId=l.companyId LEFT JOIN amortization_loans a ON a.id=t.amortizationLoanId AND a.companyId=t.companyId WHERE t.companyId=? AND COALESCE(t.status,'CONFIRMED')='CONFIRMED' ORDER BY t.paymentDate DESC,t.id DESC", [companyId]);
    const ids = payments.map((row: any) => Number(row.id));
    const allocations = ids.length ? await select(`SELECT payment_id,component,amount FROM payment_allocations WHERE payment_id IN (${ids.map(() => "?").join(",")})`, ids) : [];
    const amounts = new Map<number, { capital: number; interest: number }>();
    for (const allocation of allocations) {
      const item = amounts.get(Number(allocation.payment_id)) || { capital: 0, interest: 0 };
      if (allocation.component === "CAPITAL") item.capital += number(allocation.amount);
      if (allocation.component === "INTEREST") item.interest += number(allocation.amount);
      amounts.set(Number(allocation.payment_id), item);
    }
    return payments.map((payment: any) => {
      const mapped = amounts.get(Number(payment.id));
      return { ...payment, capital_pago: round2(mapped ? mapped.capital : Math.max(0, number(payment.amount) - number(payment.interestRateAmount))), juro_pago: round2(mapped ? mapped.interest : number(payment.interestRateAmount)), forma: String(payment.paymentMethod ?? "") };
    });
  }

  static async logReportGeneration(params: { userId: number; companyId: number; ip: string; start: string; end: string; name: string }): Promise<void> {
    await AuditLogModel.create({
      user_id: params.userId, company_id: params.companyId, ip: String(params.ip || "").slice(0, 64),
      action: "BM_REPORT_EXPORT", entity: "quarterly_bm_report", entity_id: null, before_data: null,
      after_data: { start: params.start, end: params.end, companyName: params.name, format: "xlsx" },
    });
  }

  static async getCoreCreditRanges(companyId: number): Promise<any> {
    const [row] = await select("SELECT MIN(interestRate) AS rate_min,MAX(interestRate) AS rate_max,MIN(numberOfInstallments) AS term_min,MAX(numberOfInstallments) AS term_max FROM customer_loans WHERE companyId=? AND status IN (1,3)", [companyId]);
    return { taxa_juro_min: round2(number(row?.rate_min) * 100), taxa_juro_max: round2(number(row?.rate_max) * 100), prazo_min: number(row?.term_min) || 1, prazo_max: number(row?.term_max) || 6, capital_inicial: 0, capital_actual: 0, readOnly: true, aviso: "Taxas e prazos são derivados de créditos core. Capital inicial/actual requer registo contabilístico ainda não existente." };
  }

  static async listMovements(companyId: number, start?: string, end?: string): Promise<any[]> {
    const replacements: any[] = [companyId];
    let dateClause = "";
    if (start && end) { if (!validateQuarterRange(start, end)) throw new Error("Período inválido."); dateClause = " AND opening_date BETWEEN ? AND ?"; replacements.push(start, end); }
    const rows = await select(`SELECT id,userId,opening_date,opening_balance,status,closing_balance_calculated,total_cash_in,total_cash_out,total_bank_in,total_bank_out FROM cash_registers WHERE companyId=?${dateClause} ORDER BY opening_date DESC,id DESC LIMIT 300`, replacements);
    return rows.map((row: any) => ({ id: row.id, tipo: "Caixa Central", data: row.opening_date, mes: new Date(`${dateKey(row.opening_date)}T00:00:00Z`).getUTCMonth() + 1, montante: round2(number(row.closing_balance_calculated) || number(row.opening_balance) + number(row.total_cash_in) - number(row.total_cash_out)), estado: row.status, banco_entradas: number(row.total_bank_in), banco_saidas: number(row.total_bank_out) }));
  }

  static async getDashboard(companyId: number): Promise<any> {
    const today = new Date().toISOString().slice(0, 10);
    const core = await this.loadCore(companyId, "1900-01-01", today);
    const report = this.makeReport(core);
    const active = core.loans.filter((state: LoanState) => state.capital + state.interest > 0.009);
    const portfolio = report.volume.active.capital + report.volume.active.interest;
    const risk = report.volume.risk.capital + report.volume.risk.interest;
    const sectors: any = Object.fromEntries(MICRO_SECTORS.map((sector) => [sector, 0]));
    const classes: any = { I: 0, II: 0, III: 0, IV: 0 };
    const overdue: any[] = [];
    for (const state of active) {
      sectors[state.sector] += state.capital;
      if (state.lateDays > 0) {
        const cls = riskClassForDays(state.lateDays);
        if (cls) classes[cls] += state.capital + state.interest;
        overdue.push({ id: state.loan.id, codigo: `CR-${state.loan.id}`, cliente_nome: state.loan.customerName || `Conta ${state.loan.accountNumber}`, dias_atraso: state.lateDays, classe_risco: cls, total_em_divida: state.capital + state.interest });
      }
    }
    const uniqueClients = new Set(active.map((state: LoanState) => Number(state.loan.customerId)).filter(Boolean));
    return { portfolio: round2(portfolio), riskAmount: round2(risk), riskPercent: portfolio ? round2(risk * 100 / portfolio) : 0, activeClients: uniqueClients.size, activeCredits: active.length, sectors, riskClasses: classes, overdue: overdue.sort((a, b) => b.dias_atraso - a.dias_atraso).slice(0, 15), dataWarnings: report.dataWarnings };
  }
}
