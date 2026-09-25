/**
 * Smoke test dos 4 documentos legais (pdfkit) com dados simulados.
 * Uso: node scripts/smoke-legal-docs.js   (requer `npx tsc` corrido antes)
 * Gera PDFs em uploads/docs/smoke/ para inspecção visual.
 */
const fs = require("fs");
const path = require("path");

const { renderLegalDoc } = require("../build/src/services/legalDocsService");

// Mock leve de instância Sequelize: getDataValue devolve o próprio campo
const rec = (obj) => ({ ...obj, getDataValue(key) { return obj[key]; } });

const company = rec({
  companyName: "MBR Microcrédito",
  companyAddress: "Bairro Mukhatine, Maputo",
  companyNuit: "103048273",
  companyPhone: "843397628",
  companyEmail: "geral@mbrmicrocredito.co.mz",
  companyWebsite: "www.mbrmicrocredito.co.mz",
  companyLogo: "",
  companyManager: "Emídio Macuácua",
  forfeit: 0.1,
  contractHideInsuranceClause: 0,
});

const customer = rec({
  customerName: "Marcelino Horacio Jose da Silva",
  accountNumber: 105,
  customerPhone: "847836358",
  customerNuit: "120261347",
  customerNationalId: "110100123456B",
  customerAddress: "Bairro Mukhatine, Q.23, Casa 45, Maputo",
  customerGender: "M",
  customerType: "PF",
});

// Plano Price: 300.000 MZN, 2% a.m., 18 prestações (valores do print oficial)
const amount = 300000;
const monthlyRate = 0.02;
const n = 18;
const pmt = Math.round((amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n))) * 100) / 100;
let saldo = amount;
const amortizations = Array.from({ length: n }, (_, i) => {
  const juros = Math.round(saldo * monthlyRate * 100) / 100;
  const amort = Math.round((pmt - juros) * 100) / 100;
  saldo = Math.round((saldo - amort) * 100) / 100;
  const due = new Date(2026, 8 + i + 1, 3);
  return rec({
    installmentOrder: `${i + 1}ª`,
    amortization: amort,
    rateAmount: juros,
    installment: pmt,
    remainingBalance: i === n - 1 ? 0 : saldo,
    dueDate: due.toISOString().slice(0, 10),
    status: 0,
    paidAmount: 0,
    lateDays: 0,
    latePaymentInterest: 0,
  });
});

const loan = rec({
  amount,
  numberOfInstallments: n,
  interestRate: monthlyRate,
  administrativeFee: 0.02,
  dateCreated: "2026-09-03",
  updatedAt: "2026-09-03",
  accountNumber: 105,
  companyId: 1,
  creditManager: "Emídio Macuácua",
});

const guarantees = [
  rec({ guaranteeDescription: "Toyota Alphard AML 485 MC", purchaseAmount: 900000, createdAt: "2026-09-03" }),
  rec({ guaranteeDescription: "Equipamento de som completo", purchaseAmount: 45000, createdAt: "2026-09-03" }),
];

const accounts = [
  rec({ accountDescription: "BCI", accountHolder: "MBR Microcrédito", accountNumber: "000123456789" }),
  rec({ accountDescription: "Millennium BIM", accountHolder: "MBR Microcrédito", accountNumber: "987654321000" }),
];

const data = { loan, customer, company, amortizations, guarantees, accounts };

const outDir = path.join(process.cwd(), "uploads", "docs", "smoke");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  for (const tipo of ["extracto", "contrato", "termo", "garantias"]) {
    const pdf = await renderLegalDoc(tipo, data);
    const out = path.join(outDir, `smoke-${tipo}.pdf`);
    fs.writeFileSync(out, pdf);
    console.log(`✓ ${tipo.padEnd(10)} ${(pdf.length / 1024).toFixed(1)} kB → ${out}`);
  }
  console.log("Smoke test concluído.");
})().catch((e) => { console.error("FALHOU:", e); process.exit(1); });
