import moment from "moment";
import { Simulator } from "../interfaces/Simulator";

/**
 * Calcula a prestação usando a fórmula do sistema de amortização francês (Price)
 * PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
 * onde:
 * PMT = Valor da prestação
 * PV = Valor presente (capital emprestado)
 * i = Taxa de juros por período
 * n = Número de períodos
 */
const calculateFrenchAmortizationInstallment = (
  principal: number,
  interestRate: number,
  numberOfPeriods: number
): number => {
  if (interestRate === 0) {
    return principal / numberOfPeriods;
  }

  const rate = interestRate;
  const numerator = rate * Math.pow(1 + rate, numberOfPeriods);
  const denominator = Math.pow(1 + rate, numberOfPeriods) - 1;
  const installment = principal * (numerator / denominator);

  return installment;
};

/**
 * Arredonda ao cêntimo com tolerância para erros de vírgula flutuante
 * (ex.: round(10.005 * 100) pode dar 1000.4999999999999).
 */
const round2 = (value: number): number => {
  const r = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

/**
 * Gera o plano de amortização usando o sistema francês (Price)
 * No sistema francês:
 * - Cada prestação tem o mesmo valor
 * - Os juros são calculados sobre o saldo devedor remanescente
 * - A parte de capital aumenta ao longo do tempo
 * - A parte de juros diminui ao longo do tempo
 *
 * GARANTIAS DE ARREDONDAMENTO (fechamento ao cêntimo):
 *  1. A prestação é arredondada 1× e usada IGUAL em TODAS as linhas
 *     (incluindo a última) — como no boletim que o cliente assina;
 *  2. A amortização vem da fórmula teórica (prestação cheia − juros teóricos);
 *     a diferença acumulada de arredondamento (poucos cêntimos) vai para a
 *     ÚLTIMA amortização → Σ amortização = capital EXACTO;
 *  3. Em cada linha, os juros são prestação − amortização → a LINHA fecha
 *     sempre (amortização + juros = prestação, sem diferenças de 0,01);
 *  4. Consequência exacta: Σ juros = n × prestação − capital (o custo total
 *     do crédito fecha ao cêntimo com o Total Dívida).
 */
const simulator = (loan: Simulator) => {
  const loanAmount = parseFloat(String(loan.amount));
  const numberOfInstallments = parseInt(String(loan.numberOfInstallments));
  const rate = parseFloat(String(loan.interestRate));

  if (loanAmount <= 0 || numberOfInstallments <= 0 || rate < 0 || !Number.isFinite(loanAmount)) {
    throw new Error("Valores inválidos para cálculo de amortização");
  }

  const amortizationPlan = [];

  // Prestação teórica do sistema francês, arredondada ao cêntimo UMA vez.
  // Todas as linhas do plano usam exactamente este valor (como no boletim
  // que o cliente assina) — nunca o double por arredondar.
  const installment = round2(
    calculateFrenchAmortizationInstallment(loanAmount, rate, numberOfInstallments)
  );

  // ── Passagem 1 (doubles, sem arredondar): amortização teórica por linha,
  // com a prestação TEÓRICA (NÃO a arredondada — usar a arredondada aqui
  // quebraria a identidade Σ amortização teórica = capital).
  const installmentTeorica = calculateFrenchAmortizationInstallment(
    loanAmount, rate, numberOfInstallments
  );
  let saldoTeorico = loanAmount;
  const amortTeorica: number[] = [];
  const saldoTeoricoPorLinha: number[] = [];
  for (let index = 0; index < numberOfInstallments; index++) {
    const jurosTeoricos = saldoTeorico * rate;
    const amort = installmentTeorica - jurosTeoricos;
    amortTeorica.push(amort);
    saldoTeorico -= amort;
    saldoTeoricoPorLinha.push(saldoTeorico);
  }

  // ── Passagem 2 (cêntimos): amortizações arredondadas; a diferença acumulada
  // (poucos cêntimos) vai para a ÚLTIMA linha → Σ amortização = capital.
  const amortizacoes = amortTeorica.map(round2);
  const somaAmort = round2(amortizacoes.reduce((s, a) => s + a, 0));
  const diffCapital = round2(loanAmount - somaAmort);
  if (diffCapital !== 0 && amortizacoes.length > 0) {
    amortizacoes[amortizacoes.length - 1] = round2(amortizacoes[amortizacoes.length - 1] + diffCapital);
  }

  for (let index = 0; index < numberOfInstallments; index++) {
    // Todas as prestações são mensais
    // Adiciona 1 mês à data de desembolso para cada prestação
    // Usa Date nativo para consistência com o frontend
    const baseDate = new Date(loan.dueDate);
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + (index + 1));

    const amortization = amortizacoes[index];
    // Juros = prestação − amortização → a LINHA fecha sempre ao cêntimo e
    // Σ juros = n × prestação − capital (custo total exacto).
    const rateAmount = round2(installment - amortization);
    // Saldo devedor teórico arredondado; a última linha zera por construção.
    const isLast = index === numberOfInstallments - 1;
    const remainingBalance = isLast ? 0 : Math.max(0, round2(saldoTeoricoPorLinha[index]));

    amortizationPlan.push({
      loanId: loan.loanId,
      accountNumber: loan.accountNumber,
      companyId: loan.companyId,
      status: loan.status,
      installmentOrder: (index + 1) + "ª",
      amortization,
      rateAmount,
      installment,
      remainingBalance,
      dueDate,
    });
  }

  return amortizationPlan;
};

export { simulator, calculateFrenchAmortizationInstallment };
