import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanRenewalModel } from "../database/models/LoanRenewalModel";
import { getAccruedLateInterest } from "./lateInterestService";

export type MoraMode = "charge" | "waive" | "discount";

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

const groupInteger = (int: string): string =>
  int.length >= 5 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : int;

const fmtMoney = (value: any): string => {
  const n = round2(Number(value) || 0);
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const sign = n < 0 ? "-" : "";
  return `${sign}${groupInteger(int)},${dec} MZN`;
};

const fmtDateShort = (dateStr: any): string => {
  if (!dateStr) return "-";
  const raw = String(dateStr).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const numberToWords = (num: number): string => {
  if (num === 0) return "zero";
  const ones = [
    "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove",
  ];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = [
    "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
    "seiscentos", "setecentos", "oitocentos", "novecentos",
  ];

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 20) return ones[n];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " e " + ones[n % 10] : "");
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const remainder = n % 100;
      return hundreds[h] + (remainder !== 0 ? " e " + convertGroup(remainder) : "");
    }
    return "";
  };

  const intPart = Math.floor(Math.abs(num));
  if (intPart === 0) return "zero";

  let result = "";
  let remaining = intPart;
  let groupIndex = 0;
  while (remaining > 0) {
    const group = remaining % 1000;
    if (group !== 0) {
      let groupText = convertGroup(group);
      if (groupIndex === 2 && group === 1) {
        groupText = "um milhão";
      } else if (groupIndex === 2 && group > 1) {
        groupText += " milhões";
      } else if (groupIndex === 1) {
        groupText = group === 1 ? "mil" : groupText + " mil";
      }
      result = groupText + (result !== "" ? " e " : "") + result;
    }
    remaining = Math.floor(remaining / 1000);
    groupIndex++;
  }
  return result;
};

const addOneMonthIso = (isoDate: string): string => {
  const m = String(isoDate || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const base = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date();
  base.setMonth(base.getMonth() + 1);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const companyLogoPath = (logo: any): string | null => {
  if (!logo) return null;
  const fileName = path.basename(String(logo));
  const candidates = [
    path.join(process.cwd(), "uploads", "img", fileName),
    path.join(process.cwd(), "uploads", "documents", fileName),
    path.join(process.cwd(), "uploads", fileName),
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
};

/**
 * Valida se o crédito é elegível para Renovação por Pagamento de Juros.
 * REGRA ESTRITA DO UTILIZADOR:
 * - Não deve ser aplicado a créditos com várias prestações (numberOfInstallments > 1).
 * - Apenas créditos de prestação única (1 prestação), mesmo que já tenham sido
 *   renovados anteriormente (onde as prestações anteriores ficaram fechadas com amortization = 0).
 */
export const verifySingleInstallmentLoanEligibility = async (
  loan: any,
  allLoanInstallments: any[],
  targetInstallment: any
): Promise<{ eligible: boolean; reason?: string }> => {
  if (!loan) {
    return { eligible: false, reason: "Crédito não encontrado." };
  }
  if (Number(loan.status) !== 1) {
    return { eligible: false, reason: "Apenas créditos activos podem ser renovados." };
  }

  const contractedInstallments = Number(loan.numberOfInstallments) || 1;
  if (contractedInstallments > 1) {
    return {
      eligible: false,
      reason:
        "A renovação por pagamento de juros aplica-se exclusivamente a créditos de prestação única (1 prestação). Créditos com várias prestações não podem ser renovados.",
    };
  }

  const openInstallments = (allLoanInstallments || []).filter(
    (item: any) => Number(item.status) !== 1
  );
  if (openInstallments.length !== 1) {
    return {
      eligible: false,
      reason:
        "Este crédito possui múltiplas prestações em aberto e não é elegível para renovação de prestação única.",
    };
  }

  if (Number(targetInstallment.status) === 1) {
    return {
      eligible: false,
      reason: "Esta prestação já se encontra integralmente liquidada.",
    };
  }

  return { eligible: true };
};

export interface RenewalQuoteInput {
  installmentId: number;
  payDate?: string;
  newDueDate?: string;
  moraMode?: MoraMode;
  moraCustomAmount?: number;
}

export const calculateRenewalQuote = async (input: RenewalQuoteInput) => {
  const inst: any = await AmorizationLoanModel.findByPk(input.installmentId);
  if (!inst) {
    const err: any = new Error("Prestação não encontrada.");
    err.status = 404;
    throw err;
  }

  const loanId = Number(inst.getDataValue("loanId"));
  const loan: any = await LoanModel.findByPk(loanId);
  const allInstallments: any[] = await AmorizationLoanModel.findAll({
    where: { loanId },
    order: [["dueDate", "ASC"], ["id", "ASC"]],
    raw: true,
  });

  const eligibility = await verifySingleInstallmentLoanEligibility(
    loan ? loan.toJSON() : null,
    allInstallments,
    inst.toJSON()
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const payDate =
    input.payDate && /^\d{4}-\d{2}-\d{2}$/.test(String(input.payDate).slice(0, 10))
      ? String(input.payDate).slice(0, 10)
      : todayIso;

  const previousDueDate = String(inst.getDataValue("dueDate") || todayIso).slice(0, 10);
  const candidateDueFromPrev = addOneMonthIso(previousDueDate);
  const defaultNewDueDate =
    candidateDueFromPrev > payDate ? candidateDueFromPrev : addOneMonthIso(payDate);

  const newDueDate =
    input.newDueDate && /^\d{4}-\d{2}-\d{2}$/.test(String(input.newDueDate).slice(0, 10))
      ? String(input.newDueDate).slice(0, 10)
      : defaultNewDueDate;

  const companyId = Number(inst.getDataValue("companyId"));
  const principalAmount = round2(
    Number(inst.getDataValue("amortization")) || Number(loan?.getDataValue("amount")) || 0
  );
  const interestAmount = round2(Number(inst.getDataValue("rateAmount")) || 0);
  const installmentAmount = round2(Number(inst.getDataValue("installment")) || 0);
  const alreadyPaid = round2(Number(inst.getDataValue("paidAmount")) || 0);

  // Juros de mora calculados pelo motor oficial (company_penalty_rules)
  const lateCalc = await getAccruedLateInterest({
    amortizationLoanId: Number(inst.getDataValue("id")),
    installmentValue: installmentAmount,
    paidAmount: alreadyPaid,
    dueDate: previousDueDate,
    companyId,
    referenceDate: payDate,
  });

  const moraCalculated = round2(Number(lateCalc.amount) || 0);
  const moraDays = Number(lateCalc.daysLate) || 0;

  const moraMode: MoraMode =
    input.moraMode === "waive" || input.moraMode === "discount" || input.moraMode === "charge"
      ? input.moraMode
      : "charge";

  let moraCharged = moraCalculated;
  if (moraMode === "waive") {
    moraCharged = 0;
  } else if (moraMode === "discount") {
    const requested = round2(Math.max(0, Number(input.moraCustomAmount) || 0));
    moraCharged = Math.min(moraCalculated, requested);
  }
  const moraWaived = round2(Math.max(0, moraCalculated - moraCharged));

  // Quanto falta pagar dos juros normais deste período:
  // Se o cliente já pagou >= rateAmount (ex.: Aksa Sango pagou 600 MZN de 600 MZN de juros),
  // interestRemainingToPay = 0!
  const interestRemainingToPay = round2(Math.max(0, interestAmount - alreadyPaid));
  const isInterestAlreadyPaid = alreadyPaid >= interestAmount - 0.01;
  const totalToPayNow = round2(interestRemainingToPay + moraCharged);

  const monthlyRate = Number(loan?.getDataValue("interestRate")) || 0;
  const newInterestAmount =
    monthlyRate > 0 ? round2(principalAmount * monthlyRate) : interestAmount;
  const newInstallmentAmount = round2(principalAmount + newInterestAmount);

  const existingRenewalsCount = await LoanRenewalModel.count({ where: { loanId } });
  const renewalNumber = Math.max(
    existingRenewalsCount + 1,
    (Number(loan?.getDataValue("renewalCount")) || 0) + 1
  );
  const nextInstallmentOrder = String(allInstallments.length + 1);

  return {
    eligible: eligibility.eligible,
    ineligibleReason: eligibility.reason || null,
    installmentId: Number(inst.getDataValue("id")),
    loanId,
    companyId,
    customerId: Number(inst.getDataValue("customerId")) || Number(loan?.getDataValue("customerId")),
    accountNumber: Number(inst.getDataValue("accountNumber")) || Number(loan?.getDataValue("accountNumber")),
    installmentOrder: String(inst.getDataValue("installmentOrder") || "1"),
    nextInstallmentOrder,
    renewalNumber,
    payDate,
    previousDueDate,
    defaultNewDueDate,
    newDueDate,
    principalAmount,
    interestAmount,
    installmentAmount,
    alreadyPaid,
    isInterestAlreadyPaid,
    interestRemainingToPay,
    moraCalculated,
    moraDays,
    moraMode,
    moraCharged,
    moraWaived,
    totalToPayNow,
    monthlyRate,
    newInterestAmount,
    newInstallmentAmount,
  };
};

/**
 * Gera o PDF oficial do "ADITAMENTO E TERMO DE RENOVAÇÃO DE CONTRATO DE MÚTUO E CONFISSÃO DE DÍVIDA"
 */
export const generateLoanRenewalPdfBuffer = async (
  quote: Awaited<ReturnType<typeof calculateRenewalQuote>>,
  notes?: string | null
): Promise<Buffer> => {
  const [company, customer, loan] = await Promise.all([
    CompanyModel.findByPk(quote.companyId, { raw: true }) as Promise<any>,
    CustomerModel.findOne({
      where: { accountNumber: quote.accountNumber, companyId: quote.companyId },
      raw: true,
    }) as Promise<any>,
    LoanModel.findByPk(quote.loanId, { raw: true }) as Promise<any>,
  ]);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 42, bottom: 42, left: 48, right: 48 },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = 48;
      const right = 595.28 - 48;
      const width = right - left;

      // 1. Cabeçalho Institucional
      const logoFile = companyLogoPath(company?.companyLogo);
      let headerTop = 40;
      if (logoFile) {
        try {
          doc.image(logoFile, left, headerTop, { width: 58, height: 58 });
        } catch {
          // ignora falha de imagem
        }
      }

      const textX = logoFile ? left + 68 : left;
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#1a237e")
        .text(String(company?.companyName || "INSTITUIÇÃO DE MICROCRÉDITO").toUpperCase(), textX, headerTop, {
          width: width - (logoFile ? 68 : 0),
        });

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#444444")
        .text(
          [
            company?.companyNuit ? `NUIT: ${company.companyNuit}` : null,
            company?.companyAddress ? `Endereço: ${company.companyAddress}` : null,
            company?.companyPhone ? `Tel: ${company.companyPhone}` : null,
            company?.companyEmail ? `Email: ${company.companyEmail}` : null,
          ]
            .filter(Boolean)
            .join("  |  "),
          textX,
          doc.y + 2,
          { width: width - (logoFile ? 68 : 0) }
        );

      const lineY = Math.max(doc.y + 12, headerTop + 62);
      doc
        .moveTo(left, lineY)
        .lineTo(right, lineY)
        .lineWidth(1.5)
        .strokeColor("#1a237e")
        .stroke();

      // 2. Título do Documento
      doc.y = lineY + 14;
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#1a237e")
        .text(
          "ADITAMENTO E TERMO DE RENOVAÇÃO DE CONTRATO DE MÚTUO E CONFISSÃO DE DÍVIDA",
          left,
          doc.y,
          { width, align: "center" }
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("#c62828")
        .text(
          `${quote.renewalNumber}ª RENOVAÇÃO POR LIQUIDAÇÃO DE JUROS — CRÉDITO Nº #${quote.loanId} (CONTA Nº ${quote.accountNumber})`,
          left,
          doc.y + 4,
          { width, align: "center" }
        );

      doc.moveDown(1);

      // 3. Identificação das Partes
      const customerName = customer?.customerName || `Cliente Conta #${quote.accountNumber}`;
      const customerDocType = customer?.customerDocumentType || "BI";
      const customerDocNumber = customer?.customerDocumentNumber || "-";
      const customerNuit = customer?.customerNuit || "-";
      const customerAddress = [
        customer?.customerNeighborhood,
        customer?.customerDistrict,
        customer?.customerProvince,
      ]
        .filter(Boolean)
        .join(", ") || "Moçambique";
      const customerPhone = customer?.customerPhone || "-";

      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#111111")
        .text(
          `Entre a Mutuante, ${company?.companyName || "a Instituição de Microcrédito"}, com sede em ${company?.companyAddress || "Moçambique"}, NUIT ${company?.companyNuit || "-"}, e o(a) Mutuário(a) `,
          left,
          doc.y,
          { width, align: "justify", continued: true }
        )
        .font("Helvetica-Bold")
        .text(`${customerName}`, { continued: true })
        .font("Helvetica")
        .text(
          `, titular do documento de identificação (${customerDocType}) nº ${customerDocNumber}, NUIT ${customerNuit}, residente em ${customerAddress}, contacto telefónico ${customerPhone}, é celebrado o presente Termo de Renovação de Contrato de Crédito e Confissão de Dívida, referente ao Contrato de Mútuo nº #${quote.loanId}, celebrado originalmente em ${fmtDateShort(loan?.disbursementDate || loan?.dateCreated)}, nos termos das cláusulas e quadro financeiro seguintes:`
        );

      doc.moveDown(0.8);

      // 4. Quadro Resumo Financeiro da Renovação
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#1a237e")
        .text("QUADRO FINANCEIRO DA RENOVAÇÃO", left, doc.y);

      const tableTop = doc.y + 6;
      const col1Width = width * 0.58;
      const col2Width = width * 0.42;
      const rowHeight = 19;

      const summaryRows: Array<[string, string, boolean?]> = [
        ["Capital Mutuado em Dívida (Transitado para o Novo Período)", fmtMoney(quote.principalAmount), true],
        [`Juros Remuneratórios do Período Anterior (${quote.installmentOrder}ª Prestação)`, fmtMoney(quote.interestAmount), false],
        [
          quote.moraWaived > 0
            ? `Juros de Mora (${quote.moraDays} dias) — Isentado/Perdoado: ${fmtMoney(quote.moraWaived)}`
            : `Juros de Mora Apurados (${quote.moraDays} dias)`,
          fmtMoney(quote.moraCharged),
          false,
        ],
        ["Data de Vencimento do Período Anterior", fmtDateShort(quote.previousDueDate), false],
        ["Data de Efectivação da Renovação", fmtDateShort(quote.payDate), false],
        ["NOVA DATA DE VENCIMENTO ACORDADA", fmtDateShort(quote.newDueDate), true],
        [
          `Novos Juros Remuneratórios do Período Renovado (${round2(quote.monthlyRate * 100)}% a.m.)`,
          fmtMoney(quote.newInterestAmount),
          false,
        ],
        [
          `VALOR TOTAL A PAGAR NO NOVO VENCIMENTO (${quote.nextInstallmentOrder}ª Prestação)`,
          fmtMoney(quote.newInstallmentAmount),
          true,
        ],
      ];

      let currY = tableTop;
      summaryRows.forEach((row, idx) => {
        const [label, val, highlight] = row;
        const bg = highlight ? "#e8eaf6" : idx % 2 === 1 ? "#f9fafb" : "#ffffff";
        doc.rect(left, currY, width, rowHeight).fillAndStroke(bg, "#d0d7de");
        doc
          .font(highlight ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9)
          .fillColor(highlight ? "#1a237e" : "#222222")
          .text(label, left + 8, currY + 5, { width: col1Width - 12 });
        doc
          .font(highlight ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9.5)
          .fillColor(highlight ? "#1a237e" : "#111111")
          .text(val, left + col1Width, currY + 5, { width: col2Width - 8, align: "right" });
        currY += rowHeight;
      });

      doc.y = currY + 12;

      // 5. Cláusulas Contratuais da Renovação
      const clauses = [
        {
          title: "CLÁUSULA PRIMEIRA (Liquidação de Juros e Objecto da Renovação)",
          body: `Pelo presente instrumento, confirma-se a liquidação integral dos encargos remuneratórios (juros) referentes ao período vencido em ${fmtDateShort(quote.previousDueDate)}, no montante de ${fmtMoney(quote.interestAmount)}${quote.moraCharged > 0 ? `, acrescidos de ${fmtMoney(quote.moraCharged)} a título de juros de mora` : ""}${quote.moraWaived > 0 ? ` (tendo sido concedido perdão/isenção de mora no valor de ${fmtMoney(quote.moraWaived)})` : ""}. Em virtude do pagamento exclusivo de juros, as partes acordam na renovação do prazo de reembolso do capital mutuado de ${fmtMoney(quote.principalAmount)} (${numberToWords(quote.principalAmount)} meticais) por mais 1 (um) período mensal.`,
        },
        {
          title: "CLÁUSULA SEGUNDA (Confissão de Dívida e Novo Vencimento)",
          body: `O(A) Mutuário(a) reconhece e confessa-se devedor(a) da quantia total de ${fmtMoney(quote.newInstallmentAmount)} (${numberToWords(quote.newInstallmentAmount)} meticais), correspondente à soma do capital transitado de ${fmtMoney(quote.principalAmount)} e dos novos juros remuneratórios de ${fmtMoney(quote.newInterestAmount)}, comprometendo-se de forma irrevogável a proceder à sua liquidação até ao dia ${fmtDateShort(quote.newDueDate)}.`,
        },
        {
          title: "CLÁUSULA TERCEIRA (Manutenção das Garantias e Condições Originais)",
          body: `A presente renovação não constitui novação extintiva das garantias anteriormente prestadas. Permanecem em pleno vigor todas as garantias móveis, imóveis, penhores, declarações e demais cláusulas penalizadoras constantes do Contrato de Concessão de Crédito nº #${quote.loanId}, que este aditamento passa a integrar como parte indissociável.`,
        },
        {
          title: "CLÁUSULA QUARTA (Incumprimento e Juros de Mora)",
          body: `A falta de pagamento do valor acordado na nova data de vencimento (${fmtDateShort(quote.newDueDate)}) constituirá o(a) Mutuário(a) imediatamente em mora, sujeitando-o(a) à aplicação das taxas de penalização em vigor na Mutuante e à execução imediata das garantias contratuais.`,
        },
      ];

      for (const c of clauses) {
        doc
          .font("Helvetica-Bold")
          .fontSize(9.2)
          .fillColor("#1a237e")
          .text(c.title, left, doc.y, { width });
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#222222")
          .text(c.body, left, doc.y + 2, { width, align: "justify" });
        doc.moveDown(0.55);
      }

      if (notes && String(notes).trim()) {
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#444444")
          .text(`Observações Adicionais: `, left, doc.y, { continued: true })
          .font("Helvetica")
          .text(String(notes).trim());
        doc.moveDown(0.5);
      }

      // 6. Local, Data e Assinaturas
      doc.moveDown(0.8);
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#111111")
        .text(
          `Celebrado em duplicado e assinado de boa-fé em ${fmtDateShort(quote.payDate)}, ficando um exemplar na posse de cada uma das partes.`,
          left,
          doc.y,
          { width, align: "center" }
        );

      const sigY = Math.min(doc.y + 48, 755);
      const sigBlockWidth = (width - 40) / 2;

      // Linha Mutuante
      doc
        .moveTo(left, sigY)
        .lineTo(left + sigBlockWidth, sigY)
        .lineWidth(0.8)
        .strokeColor("#333333")
        .stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#111111")
        .text("PELA MUTUANTE", left, sigY + 5, { width: sigBlockWidth, align: "center" });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#555555")
        .text(String(company?.companyName || "A Direcção / Gestor"), left, sigY + 17, {
          width: sigBlockWidth,
          align: "center",
        });

      // Linha Mutuário
      const rightSigX = left + sigBlockWidth + 40;
      doc
        .moveTo(rightSigX, sigY)
        .lineTo(rightSigX + sigBlockWidth, sigY)
        .lineWidth(0.8)
        .strokeColor("#333333")
        .stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#111111")
        .text("O(A) MUTUÁRIO(A)", rightSigX, sigY + 5, { width: sigBlockWidth, align: "center" });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#555555")
        .text(customerName, rightSigX, sigY + 17, {
          width: sigBlockWidth,
          align: "center",
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
